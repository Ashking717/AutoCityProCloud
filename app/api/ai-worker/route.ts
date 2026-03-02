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
| Summary      | ഇന്നത്തെ സംഗ്രഹം       | ملخص اليوم              |
| Stock        | സ്റ്റോക്ക്             | مخزون                   |
| Customer     | ഉപഭോക്താവ്             | عميل / زبون             |
| Supplier     | വിതരണക്കാരൻ           | مورد                    |

## Shorthand messages
Messages starting with "Create a new sale…", "Create a new purchase…", "Create a new product…" are pre-expanded shortcuts. Execute them immediately without re-confirming already-provided fields.
- "Create a new customer first" → call create_customer, then immediately use the returned id.
- "Create a new supplier first" → call create_supplier, then immediately use the returned id.

## Core rules (read carefully)
1. **NEVER fabricate IDs.** IDs are 24-character MongoDB strings like "6642a1f3e4b0c72d88f1a3b9".
   If you do not have a result from a search/create tool IN THIS RESPONSE's tool calls, you MUST
   call the search tool again — even if you think you know the ID from earlier in the conversation.
   History does not preserve IDs reliably. Always re-search before every write operation.2. **On not-found (0 results):** tell the user and ask to verify — do NOT retry.
3. **Parallel tool calls:** run search_customers + search_products in parallel when needed.
4. **Walk-in sales:** use customerId="walk-in", customerName="Walk-In Customer".
   **if the user is providing a mobile number, create a new walk-in customer with that mobile number as customerId and use the returned ID.**
5. **amountPaid:** omit for full payment. Set to 0 for CREDIT transactions.
6. **Default payment method:** CARD unless stated otherwise.
7. **SKU:** auto-generated — never ask the user.
8. **Vehicle rule:** set isVehicle=true if ANY vehicle field is provided.
9. **After success:** confirm with reference number and total. Keep it short.
10. **Discounts:** top-level \`discount\` field only. Never at item level.

## ⚠️ CONFIRMATION REQUIRED BEFORE ALL WRITE OPERATIONS
Before calling ANY of these tools:
  create_sale | create_purchase | create_product | create_expense | create_voucher | create_closing

You MUST first present a clear summary to the user and ask for confirmation.
Format the summary like this:

---
📝 **Summary — [Action Type]**
[Key fields: customer/supplier, items, amounts, payment method, etc.]
**Total: QAR X.XX**

Shall I proceed?
---

Only call the write tool AFTER the user replies with an affirmative (yes / confirm / proceed / ok / go ahead).
If the user requests changes, update the plan and show the summary again before proceeding.
Exception: if the user's message already contains an explicit "confirm" or "yes proceed" at the start, skip the confirmation prompt.

## Workflows

### Sale
1. search_customers + search_products (parallel)
2. Present confirmation summary → wait for user approval
3. create_sale
4. balance_due should be set to 0 everytime.

### Purchase
1. search_suppliers + search_products (parallel)
2. Present confirmation summary → wait for user approval
3. create_purchase

### Expense
1. get_expense_accounts
2. Present confirmation summary → wait for user approval
3. create_expense

### New product
1. get_categories
2. Present confirmation summary → wait for user approval
3. create_product (retry with sku+1 if duplicate)

### Voucher (Contra / Payment / Receipt / Journal)
**DEBIT = where money GOES TO. CREDIT = where money COMES FROM.**
- Withdrawal from bank: Cash DR, Bank CR
- Deposit to bank:      Bank DR, Cash CR
- Payment out:         Expense DR, Cash/Bank CR
- Receipt in:          Cash/Bank DR, Income CR

1. search_accounts with accountGroup="Cash & Bank"
2. Build balanced entries
3. Present confirmation summary → wait for user approval
4. create_voucher with status="posted"

### Day/Month Closing
1. preview_closing (fetches live figures from ledger)
2. Present the full preview to user — revenue, costs, profit, balances
3. Ask: "Shall I close the [day/month]?"
4. Only after explicit confirmation → create_closing

### Summary / report
1. get_summary — use type="all" unless user asks for specific type

`;

// ─── Helper: strip tool/tool_calls messages ────────────────────────────────────
// tool messages must always be paired with a preceding tool_calls message.
// When history is serialised and deserialised (e.g. via Telegram sessions) those
// pairs can be broken, causing a 400 from OpenAI. We sanitize at both entry and
// exit to guarantee clean history at all times.
function sanitize(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  // Build a set of tool_call_ids that have a preceding assistant tool_calls message
  const coveredToolCallIds = new Set<string>();

  for (const m of messages) {
    if (m.role === 'assistant' && (m as any).tool_calls?.length) {
      for (const tc of (m as any).tool_calls) {
        coveredToolCallIds.add(tc.id);
      }
    }
  }

  return messages.filter((m) => {
    // Always keep user messages
    if (m.role === 'user') return true;

    // Keep assistant messages that have text content
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim() !== '') return true;

    // Keep assistant messages that have tool_calls (they will be paired below)
    if (m.role === 'assistant' && (m as any).tool_calls?.length) return true;

    // Keep tool messages only if their tool_call_id is covered
    if (m.role === 'tool' && coveredToolCallIds.has((m as any).tool_call_id)) return true;

    // Drop everything else (orphaned tool messages, empty assistant messages)
    return false;
  });
}

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

    // ✅ Sanitize incoming history — remove any tool/tool_calls messages that
    // cannot be safely replayed without their paired counterparts.
    const sanitizedMessages = sanitize(clientMessages);

    // Validate model — fall back to default if unknown/missing
    const model = clientModel && ALLOWED_MODELS.has(clientModel) ? clientModel : DEFAULT_MODEL;

    console.log(`[AI Worker] Using model: ${model}`);

    // Expand shorthand in the last user message
    const processedMessages = sanitizedMessages.map((msg, idx) => {
      const isLastUser = idx === sanitizedMessages.length - 1 && msg.role === 'user';
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

      // ✅ Sanitize output — strip tool/tool_calls before returning to caller
      // so Telegram sessions never accumulate unpayable message pairs.
      const updatedMessages = [
        ...sanitize(currentMessages.slice(1)),
        { role: 'assistant' as const, content: text },
      ];

      return NextResponse.json({ message: text, updatedMessages });
    }

    // Exceeded step limit
    const timeoutMsg = 'This request required too many steps to complete. Please try rephrasing or breaking it into smaller tasks.';
    return NextResponse.json({
      message:         timeoutMsg,
      updatedMessages: [
        ...sanitize(currentMessages.slice(1)),
        { role: 'assistant' as const, content: timeoutMsg },
      ],
    });

  } catch (err: any) {
    console.error('[AI Worker] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}