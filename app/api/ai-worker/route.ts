import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

import { verifyToken } from '@/lib/auth/jwt';
import { aiWorkerTools } from '@/lib/ai-worker/tools';
import { executeTool, ExecutorContext } from '@/lib/ai-worker/executor';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the AutoCity ERP AI assistant — a capable, efficient staff member managing business operations.

Today's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

## Your responsibilities:
- **Sales**: Record sales/invoices when products are sold to customers
- **Purchases**: Record purchases from suppliers that update inventory
- **Expenses**: Record operational costs (utilities, rent, salaries, maintenance, etc.)
- **Products**: Add new products to the inventory catalog
- **Reports**: Summarize financial data on request

## Strict workflow:
1. **Sales** → search_customers + search_products → create_sale
2. **Purchases** → search_suppliers + search_products → create_purchase
3. **Expenses** → get_expense_accounts → create_expense
4. **New product** → get_categories → create_product
   - Always ask for: name, category, cost price, selling price
   - Optionally: unit, opening stock, part number, vehicle details
   - SKU is auto-generated — never ask the user for it
5. If a product/customer/supplier is not found, tell the user and ask for the correct name
6. If key info is missing, ask ONCE concisely before calling any tool
7. After success, confirm with the reference number and totals

## Communication:
- Concise and professional. Use **bold** for reference numbers and amounts.
- When multiple matches found, list them briefly and ask which to use.
- Default payment: CASH unless specified.`;

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let user: any;
    try { user = verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

    if (!user.outletId) return NextResponse.json({ error: 'No outlet' }, { status: 401 });

    // ── Derive base URL so internal fetch calls reach the same server ────────
    const headersList = headers();
    const host     = headersList.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const baseUrl  = `${protocol}://${host}`;

    const ctx: ExecutorContext = {
      userId:   user.userId,
      outletId: user.outletId,
      token,
      baseUrl,
    };

    const { messages } = await request.json();
    let currentMessages: Anthropic.MessageParam[] = messages;

    // ── Agentic loop ────────────────────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        tools:      aiWorkerTools,
        messages:   currentMessages,
      });

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const result = await executeTool(
              block.name,
              block.input as Record<string, any>,
              ctx                   // ← now includes token + baseUrl
            );
            return {
              type:        'tool_result' as const,
              tool_use_id: block.id,
              content:     JSON.stringify(result),
            };
          })
        );

        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user',      content: toolResults },
        ];
        continue;
      }

      // Final text response
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      return NextResponse.json({
        message:         textBlock?.text ?? 'Done.',
        updatedMessages: [...currentMessages, { role: 'assistant', content: response.content }],
      });
    }

    return NextResponse.json({
      message:         'Request took too many steps. Please try again.',
      updatedMessages: currentMessages,
    });

  } catch (err: any) {
    console.error('[AI Worker]', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
