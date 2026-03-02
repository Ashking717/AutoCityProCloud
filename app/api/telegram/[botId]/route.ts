//
// Multi-Bot Telegram Router
// Supports unlimited bots (each bot has its own webhook)
// Supports TEXT + VOICE
//

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import BotConfig, { IBotConfig } from '@/lib/models/BotConfig';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type IntentCategory =
  | 'sale' | 'purchase' | 'expense'
  | 'product' | 'supplier'
  | 'query' | 'report'
  | 'unknown';

type ModelKey = 'gpt-4o-mini' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4.1';

interface IntentResult {
  category: IntentCategory;
  confidence: number;
  model: ModelKey;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ─────────────────────────────────────────────────────────────
// In-memory session store (ISOLATED PER BOT)
// ─────────────────────────────────────────────────────────────

const sessionStore = new Map<string, ChatMessage[]>();

function getHistory(sessionKey: string): ChatMessage[] {
  return sessionStore.get(sessionKey) ?? [];
}

function saveHistory(sessionKey: string, history: ChatMessage[]) {
  sessionStore.set(sessionKey, history.slice(-20));
}

// ─────────────────────────────────────────────────────────────
// Model routing
// ─────────────────────────────────────────────────────────────

const INTENT_MODEL: Record<IntentCategory, ModelKey> = {
  sale: 'gpt-4.1-mini',
  purchase: 'gpt-4.1-mini',
  expense: 'gpt-4.1-mini',
  product: 'gpt-4.1-mini',
  supplier: 'gpt-4.1-mini',
  query: 'gpt-4.1-mini',
  report: 'gpt-4o',
  unknown: 'gpt-4o',
};

// ─────────────────────────────────────────────────────────────
// Intent classifier
// ─────────────────────────────────────────────────────────────

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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM },
          { role: 'user', content: text },
        ],
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const category =
      parsed.category in INTENT_MODEL ? parsed.category : 'unknown';

    return {
      category,
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      model: INTENT_MODEL[category as IntentCategory],
    };
  } catch {
    return { category: 'unknown', confidence: 0, model: 'gpt-4o' };
  }
}

// ─────────────────────────────────────────────────────────────
// AI Worker Caller
// ─────────────────────────────────────────────────────────────

async function callAIWorker(
  userText: string,
  history: ChatMessage[],
  model: ModelKey,
  baseUrl: string,
  authToken: string
) {
  const messages = [...history, { role: 'user', content: userText }];

  const res = await fetch(`${baseUrl}/api/ai-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth-token=${authToken}`,
    },
    body: JSON.stringify({ messages, model }),
  });

  if (!res.ok) {
    throw new Error(`AI Worker ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Telegram Helpers
// ─────────────────────────────────────────────────────────────

async function sendTelegram(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: 'Markdown',
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// DB Loader (FIXED: select hidden fields)
// ─────────────────────────────────────────────────────────────

async function getBotConfig(botId: string): Promise<IBotConfig | null> {
  await connectDB();

  return BotConfig.findById(botId).select(
    '+authToken +webhookSecret +botToken'
  );
}

// ─────────────────────────────────────────────────────────────
// POST - Telegram Webhook
// ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const botId = params.botId;
    const config = await getBotConfig(botId);

    if (!config || !config.isActive) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // 🔐 Webhook secret validation
    const secretHeader = req.headers.get(
      'x-telegram-bot-api-secret-token'
    );

    if (config.webhookSecret && secretHeader !== config.webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await req.json();
    const telegramMsg = body?.message;
    if (!telegramMsg) return NextResponse.json({ ok: true });

    const chatId = telegramMsg.chat.id as number;
    const sessionKey = `${botId}:${chatId}`;

    const userText = telegramMsg.text?.trim();
    if (!userText) return NextResponse.json({ ok: true });

    const host = req.headers.get('host')!;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const intent = await classifyIntent(userText);
    const history = getHistory(sessionKey);

    const { message, updatedMessages } = await callAIWorker(
      userText,
      history,
      intent.model,
      baseUrl,
      config.authToken
    );

    saveHistory(sessionKey, updatedMessages);
    await sendTelegram(config.botToken, chatId, message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[TelegramRouter] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// GET - Register webhook for THIS bot
// ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string } }
) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('register') !== '1') {
    return NextResponse.json({ ok: true });
  }

  const config = await getBotConfig(params.botId);
  if (!config) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/${params.botId}`;

  const res = await fetch(
    `https://api.telegram.org/bot${config.botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        secret_token: config.webhookSecret,
      }),
    }
  );

  return NextResponse.json(await res.json());
}