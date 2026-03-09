import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

import { verifyToken }             from '@/lib/auth/jwt';
import { aiWorkerTools }           from '@/lib/ai-worker/tools';
import { executeTool, ExecutorContext } from '@/lib/ai-worker/executor';
import { expandShorthand }         from '@/lib/ai-worker/shorthand';
import { getAIClient }             from '@/lib/ai-worker/getAIClient';

// ─── Max agentic steps ────────────────────────────────────────────────────────
const MAX_STEPS = 16;

// ─── Allowed models (both providers) ─────────────────────────────────────────
const ALLOWED_OPENAI_MODELS = new Set([
  'gpt-5-nano',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-5-mini',
  'gpt-5.2',
  'gpt-5.4',
]);

const ALLOWED_ANTHROPIC_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-opus-4-5',
]);

const DEFAULT_OPENAI_MODEL    = 'gpt-5-mini';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the AutoCity ERP AI assistant — an efficient, accurate staff member managing business operations.

Today's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

## Language
- Detect language from the user's message: English, Malayalam (മലയാളം), or Arabic (العربية).
- **Malayalam rule: ALWAYS reply in English, regardless of whether the user writes in Malayalam.**
- Arabic rule: reply in Arabic when the user writes in Arabic.
- English: reply in English.
- Mixed-language messages → reply in English (unless Arabic is dominant, then reply in Arabic).
- Tool arguments always use English.

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

## Core rules
1. **NEVER fabricate IDs.** IDs are 24-character MongoDB strings like "6642a1f3e4b0c72d88f1a3b9".
   If you do not have a result from a search/create tool IN THIS RESPONSE's tool calls, you MUST
   call the search tool again — even if you think you know the ID from earlier in the conversation.
2. **On not-found (0 results):** tell the user and ask to verify — do NOT retry.
3. **Parallel tool calls:** run search_customers + search_products in parallel when needed.
4. **Walk-in sales:** use customerId="walk-in", customerName="Walk-In Customer".
   If the user provides a mobile number, create a new walk-in customer with that number.
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

// ─── Type guards: narrow OpenAI SDK discriminated unions ─────────────────────
// ChatCompletionTool is a union of { type:'function' } and { type:'custom' }.
// ChatCompletionMessageToolCall is the same pattern.
// TypeScript requires narrowing before accessing `.function`.

type FunctionTool = OpenAI.Chat.ChatCompletionTool & {
  type:     'function';
  function: OpenAI.FunctionDefinition;
};

type FunctionToolCall = OpenAI.Chat.ChatCompletionMessageToolCall & {
  type:     'function';
  function: { name: string; arguments: string };
};

function isFunctionTool(t: OpenAI.Chat.ChatCompletionTool): t is FunctionTool {
  return t.type === 'function';
}

function isFunctionToolCall(
  tc: OpenAI.Chat.ChatCompletionMessageToolCall,
): tc is FunctionToolCall {
  return tc.type === 'function';
}

// ─── OpenAI tool format → Anthropic tool format ───────────────────────────────
function toAnthropicTools(
  openaiTools: OpenAI.Chat.ChatCompletionTool[],
): Anthropic.Tool[] {
  return openaiTools
    .filter(isFunctionTool)
    .map(t => ({
      name:         t.function.name,
      description:  t.function.description ?? '',
      input_schema: t.function.parameters as Anthropic.Tool['input_schema'],
    }));
}

// ─── Message sanitizer (OpenAI format) ────────────────────────────────────────
function sanitizeOpenAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const coveredIds = new Set<string>();
  for (const m of messages) {
    if (m.role === 'assistant' && (m as any).tool_calls?.length) {
      for (const tc of (m as any).tool_calls) coveredIds.add(tc.id);
    }
  }
  return messages.filter(m => {
    if (m.role === 'user') return true;
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()) return true;
    if (m.role === 'assistant' && (m as any).tool_calls?.length) return true;
    if (m.role === 'tool' && coveredIds.has((m as any).tool_call_id)) return true;
    return false;
  });
}

// ─── Convert OpenAI history → Anthropic messages ─────────────────────────────
// The client sends OpenAI-format history. We normalise it for Anthropic.
function toAnthropicMessages(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const m of messages) {
    if (m.role === 'system') continue; // handled as system param

    if (m.role === 'user') {
      result.push({ role: 'user', content: typeof m.content === 'string' ? m.content : '' });
      continue;
    }

    if (m.role === 'assistant') {
      const toolCalls = (m as any).tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[] | undefined;
      if (toolCalls?.length) {
        // Narrow each tool call to the 'function' variant before accessing .function
        const functionCalls = toolCalls.filter(isFunctionToolCall);
        result.push({
          role: 'assistant',
          content: functionCalls.map(tc => ({
            type:  'tool_use' as const,
            id:    tc.id,
            name:  tc.function.name,
            input: (() => { try { return JSON.parse(tc.function.arguments); } catch { return {}; } })(),
          })),
        });
      } else {
        const text = typeof m.content === 'string' ? m.content : '';
        if (text) result.push({ role: 'assistant', content: text });
      }
      continue;
    }

    if (m.role === 'tool') {
      // Tool results must follow an assistant tool_use block — group them together
      const last = result[result.length - 1];
      const toolResult: Anthropic.ToolResultBlockParam = {
        type:        'tool_result',
        tool_use_id: (m as any).tool_call_id,
        content:     typeof m.content === 'string' ? m.content : '',
      };
      if (last?.role === 'user' && Array.isArray(last.content)) {
        (last.content as any[]).push(toolResult);
      } else {
        result.push({ role: 'user', content: [toolResult] });
      }
    }
  }

  return result;
}

// ─── Convert Anthropic response → OpenAI-compatible updatedMessages ──────────
function anthropicToOpenAIHistory(
  prevMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  assistantText: string,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    ...prevMessages,
    { role: 'assistant' as const, content: assistantText },
  ];
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let user: any;
    try { user = verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

    if (!user.outletId)
      return NextResponse.json({ error: 'No outlet associated with this account' }, { status: 401 });

    // ── Build base URL ───────────────────────────────────────────────────────
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

    // ── Parse request ────────────────────────────────────────────────────────
    const { messages: clientMessages, model: clientModel } = await request.json() as {
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
      model?:   string;
    };

    // ── Resolve provider + client from DB (falls back to env) ───────────────
    const { client, provider } = await getAIClient(user.outletId);

    console.log(`[AI Worker] provider=${provider}`);

    // ── Validate / default model ─────────────────────────────────────────────
    const allowedModels = provider === 'anthropic' ? ALLOWED_ANTHROPIC_MODELS : ALLOWED_OPENAI_MODELS;
    const defaultModel  = provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL  : DEFAULT_OPENAI_MODEL;
    const model         = clientModel && allowedModels.has(clientModel) ? clientModel : defaultModel;

    console.log(`[AI Worker] model=${model}`);

    // ── Sanitize + expand shorthand ──────────────────────────────────────────
    const sanitized = sanitizeOpenAI(clientMessages);

    const processedMessages = sanitized.map((msg, idx) => {
      const isLastUser = idx === sanitized.length - 1 && msg.role === 'user';
      if (!isLastUser) return msg;
      const content = typeof msg.content === 'string' ? msg.content : null;
      if (!content) return msg;
      const expanded = expandShorthand(content);
      if (!expanded) return msg;
      console.log('[AI Worker] Shorthand expanded:\n', expanded);
      return { ...msg, content: expanded };
    });

    // ════════════════════════════════════════════════════════════════════════
    // ANTHROPIC PATH
    // ════════════════════════════════════════════════════════════════════════
    if (provider === 'anthropic') {
      return await runAnthropicLoop(
        client as Anthropic,
        model,
        processedMessages,
        ctx,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // OPENAI PATH (original)
    // ════════════════════════════════════════════════════════════════════════
    return await runOpenAILoop(
      client as OpenAI,
      model,
      processedMessages,
      ctx,
    );

  } catch (err: any) {
    console.error('[AI Worker] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─── OpenAI agentic loop ──────────────────────────────────────────────────────
async function runOpenAILoop(
  client:     OpenAI,
  model:      string,
  messages:   OpenAI.Chat.ChatCompletionMessageParam[],
  ctx:        ExecutorContext,
): Promise<NextResponse> {
  let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.chat.completions.create({
      model,
      messages:    currentMessages,
      tools:       aiWorkerTools,
      tool_choice: 'auto',
    });

    const choice  = response.choices[0];
    const message = choice.message;

    if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length) {
      currentMessages = [...currentMessages, message];

      const toolResults = await Promise.all(
        message.tool_calls
          .filter(isFunctionToolCall)
          .map(async toolCall => {
            let toolInput: Record<string, any> = {};
            try { toolInput = JSON.parse(toolCall.function.arguments); } catch { /* */ }

            console.log(`[AI Worker/OpenAI] step=${step} tool=${toolCall.function.name}`, toolInput);
            const result = await executeTool(toolCall.function.name, toolInput, ctx);
            if (!result.success) console.warn(`[AI Worker/OpenAI] tool FAILED: ${result.message}`);

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
    const updatedMessages = [
      ...sanitizeOpenAI(currentMessages.slice(1)),
      { role: 'assistant' as const, content: text },
    ];

    return NextResponse.json({ message: text, updatedMessages });
  }

  const timeoutMsg = 'This request required too many steps. Please try rephrasing or breaking it into smaller tasks.';
  return NextResponse.json({
    message: timeoutMsg,
    updatedMessages: [
      ...sanitizeOpenAI(messages),
      { role: 'assistant' as const, content: timeoutMsg },
    ],
  });
}

// ─── Anthropic agentic loop ───────────────────────────────────────────────────
async function runAnthropicLoop(
  client:     Anthropic,
  model:      string,
  messages:   OpenAI.Chat.ChatCompletionMessageParam[],
  ctx:        ExecutorContext,
): Promise<NextResponse> {
  // We keep OpenAI-format history for the response (client always expects that format)
  // and convert on each call to Anthropic format.
  let openaiHistory = [...messages];
  const anthropicTools = toAnthropicTools(aiWorkerTools);

  for (let step = 0; step < MAX_STEPS; step++) {
    const anthropicMessages = toAnthropicMessages(openaiHistory);

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   anthropicMessages,
      tools:      anthropicTools,
    });

    const stopReason = response.stop_reason;

    // ── Tool use ──────────────────────────────────────────────────────────
    if (stopReason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      // Add assistant tool_calls to OpenAI-format history (for output serialisation)
      const assistantToolCallMsg: OpenAI.Chat.ChatCompletionMessageParam = {
        role:       'assistant',
        content:    null as any,
        tool_calls: toolUseBlocks.map(b => ({
          id:       b.id,
          type:     'function' as const,
          function: {
            name:      b.name,
            arguments: JSON.stringify(b.input),
          },
        })),
      };
      openaiHistory = [...openaiHistory, assistantToolCallMsg];

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async block => {
          const toolInput = (block.input ?? {}) as Record<string, any>;
          console.log(`[AI Worker/Anthropic] step=${step} tool=${block.name}`, toolInput);
          const result = await executeTool(block.name, toolInput, ctx);
          if (!result.success) console.warn(`[AI Worker/Anthropic] tool FAILED: ${result.message}`);

          // OpenAI-format tool result for history
          return {
            role:         'tool' as const,
            tool_call_id: block.id,
            content:      JSON.stringify(result),
          };
        }),
      );

      openaiHistory = [...openaiHistory, ...toolResults];
      continue;
    }

    // ── Text response ─────────────────────────────────────────────────────
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    const text = textBlock?.text ?? 'Done.';

    const updatedMessages = [
      ...sanitizeOpenAI(openaiHistory),
      { role: 'assistant' as const, content: text },
    ];

    return NextResponse.json({ message: text, updatedMessages });
  }

  const timeoutMsg = 'This request required too many steps. Please try rephrasing or breaking it into smaller tasks.';
  return NextResponse.json({
    message: timeoutMsg,
    updatedMessages: [
      ...sanitizeOpenAI(messages),
      { role: 'assistant' as const, content: timeoutMsg },
    ],
  });
}