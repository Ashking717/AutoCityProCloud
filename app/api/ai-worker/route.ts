import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import OpenAI from 'openai';

import { verifyToken }    from '@/lib/auth/jwt';
import { aiWorkerTools }  from '@/lib/ai-worker/tools';
import { executeTool, ExecutorContext } from '@/lib/ai-worker/executor';
import { expandShorthand } from '@/lib/ai-worker/shorthand';

const client = new OpenAI();

// ─── Max agentic steps before giving up ───────────────────────────────────────
const MAX_STEPS = 16;

// ─── Allowed models (whitelist to prevent arbitrary injection) ─────────────────
const ALLOWED_MODELS = new Set([
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
]);

const DEFAULT_MODEL = 'gpt-4o-mini';

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the AutoCity ERP AI assistant — an efficient, accurate staff member managing business operations.

Today's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

## Language
- Detect language from the user's message: English, Malayalam (മലയാളം), or Arabic (العربية).
- Reply in the SAME language. Tool arguments always use English.
- Mixed-language messages → reply in the dominant language.

Key terms:
| Concept      | Malayalam              | Arabic                  |
|--------------|------------------------|-------------------------|
| Sale         | വിൽപ്പന / വില്പ്പന    | مبيعات / بيع            |
| Purchase     | വാങ്ങൽ                | مشتريات / شراء          |
| Expense      | ചെലവ്                 | مصروفات / مصاريف        |
| Product      | ഉൽപ്പന്നം / സാധനം     | منتج / بضاعة            |
| Summary      | ഇന്നത്തെ സംഗ്രഹം       | ملخص اليോം              |
| Stock        | സ്റ്റോക്ക്             | مخزون                   |
| Customer     | ഉപഭോക്താവ്             | عميل / زبون             |
| Supplier     | വിതരണക്കാരൻ           | مورد                    |

## Shorthand messages
Messages starting with "Create a new sale…", "Create a new purchase…", "Create a new product…" are pre-expanded shortcuts. Execute them immediately without re-confirming already-provided fields.
- "Create a new customer first" → call create_customer, then immediately use the returned id.
- "Create a new supplier first" → call create_supplier, then immediately use the returned id.

## Core rules (read carefully)
1. **Never fabricate IDs.** Only use ids returned by search/create tools.
2. **On not-found (0 results):** tell the user and ask to verify — do NOT retry with the same query.
3. **Parallel tool calls:** when you need both a customer and products (or a supplier and products), issue BOTH search calls in the same step to save a round-trip.
4. **Walk-in sales:** if the user says "walk-in", "cash customer", or doesn't name a customer, use customerId="walk-in" and customerName="Walk-In Customer" — do NOT call search_customers.
5. **amountPaid:** omit when the user pays in full (the executor defaults to grandTotal). Explicitly set to 0 for CREDIT/on-account transactions.
6. **Default payment method:** CASH unless the user says otherwise.
7. **SKU:** auto-generated — never ask the user for it.
8. **Vehicle rule:** if ANY vehicle field (carMake, carModel, variant, yearFrom, yearTo, color) is provided, set isVehicle=true.
9. **Missing info:** ask ONCE, concisely, before calling any write tool. Never ask for info you already have.
10. **After success:** confirm with the reference number and total. Keep it short.
11. **Discounts:** Always set the top-level \`discount\` field on create_sale (fixed QAR amount). NEVER apply discount at the item level. NEVER put discount info in \`notes\`.


## Workflows

### Sale
1. If customer named → search_customers  ┐ run in parallel
2. search_products for each product      ┘
3. If customer not found → offer: create new OR use walk-in
4. create_sale

### Purchase
1. search_suppliers  ┐ run in parallel
2. search_products   ┘
3. If supplier not found → offer to create, then create_supplier
4. create_purchase

### Expense
1. get_expense_accounts
2. create_expense

### New product
1. get_categories (with the user's category hint as query)
2. create_product
   - Always collect: name, category, cost price, selling price
   - Optional: unit, opening stock, part number, vehicle details
3. if create fails due to duplicate sku add +1 to the sku and retry (e.g. "10001" → "10002")

### Summary / report
1. get_summary — use type="all" unless the user asks for a specific type`;

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Auth
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let user: any;
    try { user = verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

    if (!user.outletId) return NextResponse.json({ error: 'No outlet associated with this account' }, { status: 401 });

    // Build base URL for internal API calls
    const headersList = headers();
    const host        = headersList.get('host') ?? 'localhost:3000';
    const protocol    = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const baseUrl     = `${protocol}://${host}`;

    const ctx: ExecutorContext = {
      userId:   user.userId,
      outletId: user.outletId,
      token,
      baseUrl,
    };

    // Parse request
    const { messages: clientMessages, model: clientModel } = await request.json() as {
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      model?:   string;
    };

    // Validate model — fall back to default if unknown/missing
    const model = clientModel && ALLOWED_MODELS.has(clientModel) ? clientModel : DEFAULT_MODEL;

    console.log(`[AI Worker] Using model: ${model}`);

    // Expand shorthand in the last user message
    const processedMessages = clientMessages.map((msg, idx) => {
      const isLastUser = idx === clientMessages.length - 1 && msg.role === 'user';
      if (!isLastUser) return msg;
      const content = typeof msg.content === 'string' ? msg.content : null;
      if (!content) return msg;
      const expanded = expandShorthand(content);
      if (!expanded) return msg;
      console.log('[AI Worker] Shorthand expanded:\n', expanded);
      return { ...msg, content: expanded };
    });

    let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...processedMessages,
    ];

    // Agentic loop
    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await client.chat.completions.create({
        model,
        messages:    currentMessages,
        tools:       aiWorkerTools,
        tool_choice: 'auto',
        // Parallel tool calls are enabled by default in the API — no extra config needed
      });

      const choice  = response.choices[0];
      const message = choice.message;

      // Model wants to call tools
      if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length) {
        currentMessages = [...currentMessages, message];

        // Execute all tool calls in this step in parallel
        const toolResults = await Promise.all(
          message.tool_calls
            .filter((tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } =>
              tc.type === 'function')
            .map(async (toolCall) => {
              let toolInput: Record<string, any> = {};
              try { toolInput = JSON.parse(toolCall.function.arguments); } catch { /* malformed args */ }

              console.log(`[AI Worker] step=${step} tool=${toolCall.function.name}`, toolInput);

              const result = await executeTool(toolCall.function.name, toolInput, ctx);

              if (!result.success) {
                console.warn(`[AI Worker] tool=${toolCall.function.name} FAILED: ${result.message}`);
              }

              return {
                role:         'tool' as const,
                tool_call_id: toolCall.id,
                content:      JSON.stringify(result),
              };
            }),
        );

        currentMessages = [...currentMessages, ...toolResults];
        continue;
      }

      // Model produced a final text response
      const text = message.content ?? 'Done.';

      // Return updated conversation history (without the system prompt)
      const updatedMessages = currentMessages
        .slice(1)
        .concat({ role: 'assistant', content: text });

      return NextResponse.json({ message: text, updatedMessages });
    }

    // Exceeded step limit
    const timeoutMsg = 'This request required too many steps to complete. Please try rephrasing or breaking it into smaller tasks.';
    return NextResponse.json({
      message:         timeoutMsg,
      updatedMessages: currentMessages.slice(1).concat({ role: 'assistant', content: timeoutMsg }),
    });

  } catch (err: any) {
    console.error('[AI Worker] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}