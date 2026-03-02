// app/api/telegram/route.ts
//
// Reads bot token + auth token from DB (BotConfig)
// Supports TEXT + VOICE messages

import { NextRequest, NextResponse } from 'next/server';
import { connectDB }                 from '@/lib/db/mongodb';
import BotConfig, { IBotConfig }     from '@/lib/models/BotConfig';

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
  category:   IntentCategory;
  confidence: number;
  model:      ModelKey;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ─────────────────────────────────────────────────────────────
// In-memory session store
// ─────────────────────────────────────────────────────────────

const sessionStore = new Map<string, ChatMessage[]>();

function getHistory(chatId: string): ChatMessage[] {
  return sessionStore.get(chatId) ?? [];
}

function saveHistory(chatId: string, history: ChatMessage[]) {
  sessionStore.set(chatId, history.slice(-20));
}

// ─────────────────────────────────────────────────────────────
// Model routing
// ─────────────────────────────────────────────────────────────

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
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0,
        max_tokens:  60,
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

// ─────────────────────────────────────────────────────────────
// AI Worker Caller
// ─────────────────────────────────────────────────────────────

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

  const data = await res.json();
  return { reply: data.message, updatedHistory: data.updatedMessages };
}

// ─────────────────────────────────────────────────────────────
// Telegram Helpers
// ─────────────────────────────────────────────────────────────

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

async function sendChatAction(
  botToken: string,
  chatId: number | string,
  action: 'typing'
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

async function transcribeTelegramVoice(
  fileId: string,
  botToken: string
): Promise<string> {
  try {
    // Get file path
    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();
    const filePath = fileData.result?.file_path;
    if (!filePath) return '';

    // Download voice file
    const audioRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );
    const audioBuffer = await audioRes.arrayBuffer();

    // Send to OpenAI
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/ogg' }),
      'voice.ogg'
    );
    formData.append('model', 'gpt-4o-mini-transcribe');

    const openaiRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!openaiRes.ok) return '';

    const result = await openaiRes.json();
    return result.text ?? '';
  } catch (err) {
    console.error('[TelegramVoice] error:', err);
    return '';
  }
}

// ─────────────────────────────────────────────────────────────
// DB Config Loader
// ─────────────────────────────────────────────────────────────

async function getBotConfig(): Promise<IBotConfig | null> {
  await connectDB();
  return BotConfig.findOne({ platform: 'telegram', isActive: true });
}

// ─────────────────────────────────────────────────────────────
// POST Webhook
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body        = await req.json();
    const telegramMsg = body?.message;
    if (!telegramMsg) return NextResponse.json({ ok: true });

    const chatId    = telegramMsg.chat.id as number;
    const sessionId = String(chatId);

    const config = await getBotConfig();
    if (!config) {
      console.error('[TelegramRouter] No active bot config');
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    let userText: string | null = null;

    // TEXT
    if (telegramMsg.text) {
      userText = telegramMsg.text.trim();
    }

    // VOICE
    if (telegramMsg.voice) {
      await sendChatAction(config.botToken, chatId, 'typing');
      userText = await transcribeTelegramVoice(
        telegramMsg.voice.file_id,
        config.botToken
      );
    }

    if (!userText) return NextResponse.json({ ok: true });

    const host     = req.headers.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const baseUrl  = `${protocol}://${host}`;

    const intent = await classifyIntent(userText);
    console.log(`[Telegram] chat=${chatId} intent=${intent.category}`);

    const history = getHistory(sessionId);

    const { reply, updatedHistory } = await callAIWorker(
      userText,
      history,
      intent.model,
      baseUrl,
      config.authToken
    );

    saveHistory(sessionId, updatedHistory);

    await sendTelegram(config.botToken, chatId, reply);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[TelegramRouter] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// GET Webhook Registration
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('register') !== '1') {
    return NextResponse.json({ ok: true, status: 'Telegram webhook active' });
  }

  const config = await getBotConfig();
  if (!config) {
    return NextResponse.json({ error: 'No active bot config' }, { status: 404 });
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL;
  const webhookUrl = `${appUrl}/api/telegram`;

  const res = await fetch(
    `https://api.telegram.org/bot${config.botToken}/setWebhook`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
      }),
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}