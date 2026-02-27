import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { aiWorkerTools } from "@/lib/ai-worker/tools";
import { executeTool, ExecutorContext } from "@/lib/ai-worker/executor";

const openai = new OpenAI();

const SYSTEM_PROMPT = `
You are the AutoCity ERP AI assistant.

You manage:
- Sales
- Purchases
- Expenses
- Products
- Financial summaries

LANGUAGE RULES:
- Support English, Malayalam (മലയാളം), Arabic (العربية).
- Always reply in the same language the user speaks.
- For tool data (IDs, amounts, references), use English internally.

STRICT ERP RULES:
- You may ONLY perform ERP operations.
- If user asks unrelated questions, reply:
  "I can only assist with ERP operations."
- NEVER hallucinate invoices, references, or confirmations.
- A transaction is only considered completed AFTER tool execution result is returned.

FINANCIAL SAFETY:
Before calling any of these tools:
- create_sale
- create_purchase
- create_expense

You MUST first summarize the transaction and explicitly ask:
"Please confirm. Should I proceed?"

Only after user confirmation may you call the financial tool.

COMMUNICATION STYLE:
- Concise
- Professional
- Natural spoken tone (voice friendly)
- Use bold for invoice numbers and totals
`;

// ── Convert Chat Completions tool → Realtime tool ─────────────────────────────
// Chat format:     { type: 'function', function: { name, description, parameters } }
// Realtime format: { type: 'function', name, description, parameters }  (flat)
//
// Cast to `any` — the two SDK types are structurally incompatible and there is
// no shared interface. `SessionCreateParams` is also not exported in all SDK
// versions so we type the full params object as `any` too.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRealtimeTool(tool: any): Record<string, unknown> {
  return {
    type:        "function",
    name:        tool?.function?.name        ?? tool?.name        ?? "",
    description: tool?.function?.description ?? tool?.description ?? "",
    parameters:  tool?.function?.parameters  ?? tool?.parameters  ?? {},
  };
}

// ── GET /api/realtime — create ephemeral session ──────────────────────────────
export async function GET() {
  const token = cookies().get("auth-token")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Typed as `any` — Realtime SessionCreateParams is not exported in all
  // openai SDK versions and the type name changed between releases.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionParams: any = {
    model:        "gpt-4o-realtime-preview",
    voice:        "sage",
    instructions: SYSTEM_PROMPT,
    tools:        aiWorkerTools.map(toRealtimeTool),
    tool_choice:  "auto",

    input_audio_format:  "pcm16",
    output_audio_format: "pcm16",

    turn_detection: {
      type:                "server_vad",
      threshold:           0.5,
      prefix_padding_ms:   300,
      silence_duration_ms: 600,
    },
  };

  const session = await openai.beta.realtime.sessions.create(sessionParams);
  return NextResponse.json(session);
}

// ── POST /api/realtime — execute a tool call forwarded from the client ─────────
// Flow:
//   1. Realtime model fires `response.function_call_arguments.done` in browser
//   2. Client POSTs { toolName, toolInput } here
//   3. executeTool() runs with full auth + DB access
//   4. Returns { result } — client sends it back as function_call_output
export async function POST(request: NextRequest) {
  const token = cookies().get("auth-token")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any;
  try {
    user = verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!user.outletId)
    return NextResponse.json({ error: "No outlet" }, { status: 401 });

  const headersList = headers();
  const host        = headersList.get("host") ?? "localhost:3000";
  const protocol    = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const baseUrl     = `${protocol}://${host}`;

  const ctx: ExecutorContext = {
    userId:   user.userId,
    outletId: user.outletId,
    token,
    baseUrl,
  };

  let toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toolInput: Record<string, any>;

  try {
    const body = await request.json();
    toolName  = body.toolName;
    toolInput = body.toolInput ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!toolName)
    return NextResponse.json({ error: "toolName is required" }, { status: 400 });

  try {
    const result = await executeTool(toolName, toolInput, ctx);
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("[Realtime Tool Executor]", err);
    return NextResponse.json(
      { error: err.message ?? "Tool execution failed" },
      { status: 500 }
    );
  }
}