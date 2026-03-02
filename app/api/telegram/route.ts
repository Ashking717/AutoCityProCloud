// app/api/telegram/route.ts
//
// Reads bot token + auth token from DB (BotConfig) instead of .env
// No env vars needed except OPENAI_API_KEY and JWT_SECRET (already set)

import { NextRequest, NextResponse } from 'next/server';
import { connectDB }                 from '@/lib/db/mongodb';
import BotConfig, { IBotConfig }     from '@/lib/models/BotConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntentCategory =
  | 'sale' | 'purchase' | 'expense'
  | 'product' | 'supplier'
  | 'query' | 'report'
  | 'unknown';

type ModelKey = 'gpt-4o-mini' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4.1';

interface IntentResult {
  category:   IntentCategory;
  confidence: number;
  model:      ModelKey;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ─── In-process session store (per chat_id) ───────────────────────────────────
const sessionStore = new Map<string, ChatMessage[]>();

function getHistory(chatId: string): ChatMessage[] {
  return sessionStore.get(chatId) ?? [];
}
function saveHistory(chatId: string, history: ChatMessage[]) {
  sessionStore.set(chatId, history.slice(-20));
}

// ─── Model-tier policy ────────────────────────────────────────────────────────
const INTENT_MODEL: Record<IntentCategory, ModelKey> = {
  sale:     'gpt-4o-mini',
  purchase: 'gpt-4o-mini',
  expense:  'gpt-4o-mini',
  product:  'gpt-4.1-mini',
  supplier: 'gpt-4.1-mini',
  query:    'gpt-4.1-mini',
  report:   'gpt-4o',
  unknown:  'gpt-4o',
};

// ─── Intent classifier ────────────────────────────────────────────────────────
const CLASSIFIER_SYSTEM = `
You are an intent classifier for an automotive parts ERP (AutoCity).
Classify the user message into ONE category:
  sale | purchase | expense | product | supplier | query | report | unknown
Respond ONLY with compact JSON: {"category":"<category>","confidence":<0.0-1.0>}
Supports English, Malayalam, and Arabic.
`.trim();

async function classifyIntent(text: string): Promise<IntentResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        max_tokens:  60,
        temperature: 0,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM },
          { role: 'user',   content: text },
        ],
      }),
    });

    const data     = await res.json();
    const raw      = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const parsed   = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const category = (parsed.category in INTENT_MODEL ? parsed.category : 'unknown') as IntentCategory;

    return {
      category,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      model:      INTENT_MODEL[category],
    };
  } catch {
    return { category: 'unknown', confidence: 0, model: 'gpt-4o' };
  }
}

// ─── AI Worker caller ─────────────────────────────────────────────────────────
async function callAIWorker(
  userText:  string,
  history:   ChatMessage[],
  model:     ModelKey,
  baseUrl:   string,
  authToken: string,
): Promise<{ reply: string; updatedHistory: ChatMessage[] }> {
  const messages: ChatMessage[] = [...history, { role: 'user', content: userText }];

  const res = await fetch(`${baseUrl}/api/ai-worker`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie':       `auth-token=${authToken}`,
    },
    body: JSON.stringify({ messages, model }),
  });

  if (!res.ok) throw new Error(`AI Worker ${res.status}: ${await res.text()}`);

  const data: { message: string; updatedMessages: ChatMessage[] } = await res.json();
  return { reply: data.message, updatedHistory: data.updatedMessages };
}

// ─── Telegram sender ──────────────────────────────────────────────────────────
async function sendTelegram(botToken: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text:       text.slice(0, 4096),
      parse_mode: 'Markdown',
    }),
  });
}

// ─── Load active bot config from DB ──────────────────────────────────────────
async function getBotConfig(): Promise<IBotConfig | null> {
  await connectDB();
  return BotConfig.findOne({ platform: 'telegram', isActive: true });
}

// ─── Bot commands ─────────────────────────────────────────────────────────────
function handleCommand(cmd: string, sessionId: string): string {
  switch (cmd.split('@')[0]) {
    case '/start':
    case '/help':
      return (
        '👋 *AutoCity ERP Bot*\n\n' +
        'Type naturally in English, Malayalam, or Arabic.\n\n' +
        '*Examples:*\n' +
        '_"Sold 3 Michelin tyres to Ahmed for 150 each"_\n' +
        '_"Received 10 brake pads from Toyota, unit cost 45"_\n' +
        '_"Paid 200 for electricity"_\n' +
        '_"What\'s today\'s total sales?"_'
      );
    case '/clear':
      sessionStore.delete(sessionId);
      return '🗑 Conversation cleared.';
    default:
      return 'Unknown command. Type /help for options.';
  }
}

// ─── Webhook POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body        = await req.json();
    const telegramMsg = body?.message;
    if (!telegramMsg?.text) return NextResponse.json({ ok: true });

    const chatId    = telegramMsg.chat.id as number;
    const sessionId = String(chatId);
    const userText  = telegramMsg.text.trim();

    // Load bot config from DB
    const config = await getBotConfig();
    if (!config) {
      console.error('[TelegramRouter] No active bot config found in DB');
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Handle commands
    if (userText.startsWith('/')) {
      await sendTelegram(config.botToken, chatId, handleCommand(userText, sessionId));
      return NextResponse.json({ ok: true });
    }

    const host     = req.headers.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const baseUrl  = `${protocol}://${host}`;

    // Classify → resolve model
    const intent = await classifyIntent(userText);
    console.log(`[TelegramRouter] chat=${chatId} intent=${intent.category} model=${intent.model}`);

    // Load history → call AI Worker → save history
    const history = getHistory(sessionId);
    const { reply, updatedHistory } = await callAIWorker(
      userText, history, intent.model, baseUrl, config.authToken
    );
    saveHistory(sessionId, updatedHistory);

    await sendTelegram(config.botToken, chatId, reply);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[TelegramRouter] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── Register webhook GET /api/telegram?register=1 ───────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('register') !== '1') {
    return NextResponse.json({ ok: true, status: 'Telegram webhook active' });
  }

  const config = await getBotConfig();
  if (!config) return NextResponse.json({ error: 'No active bot config in DB' }, { status: 404 });

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL;
  const webhookUrl = `${appUrl}/api/telegram`;

  const res  = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}