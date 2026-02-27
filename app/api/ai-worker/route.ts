import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import OpenAI from 'openai';

import { verifyToken } from '@/lib/auth/jwt';
import { aiWorkerTools } from '@/lib/ai-worker/tools';
import { executeTool, ExecutorContext } from '@/lib/ai-worker/executor';
import { expandShorthand } from '@/lib/ai-worker/shorthand';

const client = new OpenAI();

const SYSTEM_PROMPT = `You are the AutoCity ERP AI assistant — a capable, efficient staff member managing business operations.

Today's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

## Language handling — CRITICAL:
- Users may speak or type in **English**, **Malayalam** (മലയാളം), or **Arabic** (العربية).
- You MUST understand all three languages fully.
- Always reply in the **same language the user used**. If they wrote in Malayalam, reply in Malayalam. If Arabic, reply in Arabic. If English, reply in English.
- For tool calls and internal data (product names, references, amounts), always use English regardless of the conversation language.
- If a message mixes languages (code-switching), detect the dominant language and reply in that.
- Common Malayalam ERP terms to recognise:
  - വിൽപ്പന / വില്പ്പന = sale
  - വാങ്ങൽ = purchase
  - ചെലവ് = expense
  - ഉൽപ്പന്നം / സാധനം = product
  - ഇന്നത്തെ സംഗ്രഹം = today's summary
  - സ്റ്റോക്ക് = stock / inventory
  - ഉപഭോക്താവ് = customer
  - വിതരണക്കാരൻ = supplier
- Common Arabic ERP terms to recognise:
  - مبيعات / بيع = sale
  - مشتريات / شراء = purchase
  - مصروفات / مصاريف = expense
  - منتج / بضاعة = product
  - ملخص اليوم = today's summary
  - مخزون = stock / inventory
  - عميل / زبون = customer
  - مورد = supplier

## Shorthand system:
Users may send pre-expanded shorthand instructions beginning with "Create a new sale...",
"Create a new purchase...", or "Create a new product...". These are machine-expanded
shortcuts — treat them as complete, authoritative instructions and execute immediately
without asking for confirmation of already-provided fields.
- If instructed to "Create a new customer first", call create_customer, get the returned id, then immediately proceed with the sale using that id.
- If instructed to "Create a new supplier first", call create_supplier, get the returned id, then immediately proceed with the purchase using that id.

## Your responsibilities:
- **Sales**: Record sales/invoices when products are sold to customers
- **Purchases**: Record purchases from suppliers that update inventory
- **Expenses**: Record operational costs (utilities, rent, salaries, maintenance, etc.)
- **Products**: Add new products to the inventory catalog
- **Reports**: Summarize financial data on request

## Strict workflow:
1. **Sales** → (create_customer if new) → search_customers + search_products → create_sale
2. **Purchases** → (create_supplier if new) → search_suppliers + search_products → create_purchase
3. **Expenses** → get_expense_accounts → create_expense
4. **New product** → get_categories → create_product
   - Always ask for: name, category, cost price, selling price
   - Optionally: unit, opening stock, part number, vehicle details
   - SKU is auto-generated — never ask the user for it
   - If ANY vehicle field is provided (carMake, carModel, variant, yearFrom, yearTo, color), set isVehicle=true
   - When a category is mentioned, call get_categories WITH that exact string as query — never pick from the full list blindly
5. If a product/customer/supplier is not found, tell the user and ask for the correct name
6. If key info is missing, ask ONCE concisely before calling any tool
7. After success, confirm with the reference number and totals

## Communication:
- Concise and professional. Use **bold** for reference numbers and amounts.
- When multiple matches found, list them briefly and ask which to use.
- Default payment: CASH unless specified.
- Match the user's language in your reply (English / Malayalam / Arabic).`;

export async function POST(request: NextRequest) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let user: any;
    try { user = verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

    if (!user.outletId) return NextResponse.json({ error: 'No outlet' }, { status: 401 });

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

    const { messages: clientMessages } = await request.json() as {
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
    };

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

    for (let step = 0; step < 12; step++) {
      const response = await client.chat.completions.create({
        model:       'gpt-4o',
        messages:    currentMessages,
        tools:       aiWorkerTools,
        tool_choice: 'auto',
      });

      const choice  = response.choices[0];
      const message = choice.message;

      if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length) {
        currentMessages = [...currentMessages, message];

        const functionCalls = message.tool_calls.filter(
          (tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } =>
            tc.type === 'function',
        );

        const toolResults = await Promise.all(
          functionCalls.map(async (toolCall) => {
            let toolInput: Record<string, any> = {};
            try { toolInput = JSON.parse(toolCall.function.arguments); } catch { /* */ }

            const result = await executeTool(toolCall.function.name, toolInput, ctx);

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

      const text = message.content ?? 'Done.';

      const updatedMessages = currentMessages
        .slice(1)
        .concat({ role: 'assistant', content: text });

      return NextResponse.json({ message: text, updatedMessages });
    }

    return NextResponse.json({
      message:         'Request took too many steps. Please try again.',
      updatedMessages: currentMessages.slice(1),
    });

  } catch (err: any) {
    console.error('[AI Worker]', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}