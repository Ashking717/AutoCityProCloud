// app/api/telegram/[botId]/route.ts
// Multi-Bot Telegram Router — uses outlet's configured AI key from DB
// Supports TEXT + VOICE

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import BotConfig, { IBotConfig } from '@/lib/models/BotConfig';
import { getAPIKey } from '@/lib/ai-worker/getAIClient';

// ─── Types ────────────────────────────────────────────────────────────────────
type IntentCategory =
  | 'sale' | 'purchase' | 'expense'
  | 'product' | 'supplier'
  | 'query' | 'report'
  | 'unknown';

type OpenAIModelKey  = 'gpt-5-nano' | 'gpt-5.1-mini' | 'gpt-5.2' | 'gpt-5.4' | 'gpt-4o' | 'gpt-4.1-mini' | 'gpt-4.1';
type AnthropicModelKey = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-5';
type ModelKey = OpenAIModelKey | AnthropicModelKey;

interface IntentResult {
  category:   IntentCategory;
  confidence: number;
  model:      ModelKey;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ─── In-memory session store (isolated per bot) ───────────────────────────────
const sessionStore = new Map<string, ChatMessage[]>();

function getHistory(key: string): ChatMessage[]          { return sessionStore.get(key) ?? []; }
function saveHistory(key: string, h: ChatMessage[])      { sessionStore.set(key, h.slice(-20)); }

// ─── Model routing (per provider) ────────────────────────────────────────────
const OPENAI_INTENT_MODEL: Record<IntentCategory, OpenAIModelKey> = {
  sale:     'gpt-5.2',
  purchase: 'gpt-5.2',
  expense:  'gpt-5.1-mini',
  product:  'gpt-5.1-mini',
  supplier: 'gpt-5.1-mini',
  query:    'gpt-5.1-mini',
  report:   'gpt-4.1-mini',
  unknown:  'gpt-5.1-mini',
};

const ANTHROPIC_INTENT_MODEL: Record<IntentCategory, AnthropicModelKey> = {
  sale:     'claude-sonnet-4-6',
  purchase: 'claude-sonnet-4-6',
  expense:  'claude-sonnet-4-5',
  product:  'claude-sonnet-4-5',
  supplier: 'claude-sonnet-4-5',
  query:    'claude-sonnet-4-5',
  report:   'claude-sonnet-4-5',
  unknown:  'claude-haiku-4-5-20251001',
};

// ─── Classifier system prompt ─────────────────────────────────────────────────
const CLASSIFIER_SYSTEM = `
You are an intent classifier for an automotive parts ERP (AutoCity).
Classify the user message into ONE category:
sale | purchase | expense | product | supplier | query | report | unknown
Respond ONLY with compact JSON: {"category":"<category>","confidence":<0.0-1.0>}
Supports English, Malayalam, and Arabic.
`.trim();

// ─── Intent classifier ────────────────────────────────────────────────────────
async function classifyIntent(
  text:      string,
  apiKey:    string,
  provider:  'openai' | 'anthropic',
): Promise<IntentResult> {
  try {
    let raw = '{}';

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 60,
          system:     CLASSIFIER_SYSTEM,
          messages:   [{ role: 'user', content: text }],
        }),
      });
      const data = await res.json();
      raw = data.content?.[0]?.text?.trim() ?? '{}';
    } else {
      // OpenAI
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${apiKey}`,
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
      const data = await res.json();
      raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    }

    const parsed   = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const category = (parsed.category in OPENAI_INTENT_MODEL
      ? parsed.category : 'unknown') as IntentCategory;

    const model: ModelKey = provider === 'anthropic'
      ? ANTHROPIC_INTENT_MODEL[category]
      : OPENAI_INTENT_MODEL[category];

    return {
      category,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      model,
    };
  } catch {
    const model: ModelKey = provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o';
    return { category: 'unknown', confidence: 0, model };
  }
}

// ─── AI Worker caller ─────────────────────────────────────────────────────────
async function callAIWorker(
  userText:  string,
  history:   ChatMessage[],
  model:     ModelKey,
  baseUrl:   string,
  authToken: string,
) {
  const messages = [...history, { role: 'user', content: userText }];

  const res = await fetch(`${baseUrl}/api/ai-worker`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie:         `auth-token=${authToken}`,
    },
    body: JSON.stringify({ messages, model }),
  });

  if (!res.ok) throw new Error(`AI Worker ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────
async function sendTelegram(botToken: string, chatId: number, text: string) {
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

async function sendChatAction(botToken: string, chatId: number, action: 'typing') {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

// ─── Voice transcription ──────────────────────────────────────────────────────
async function transcribeTelegramVoice(
  fileId:   string,
  botToken: string,
  apiKey:   string,
  provider: 'openai' | 'anthropic',
): Promise<string> {
  try {
    const fileRes  = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    const filePath = fileData.result?.file_path;
    if (!filePath) return '';

    const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!audioRes.ok) return '';
    const audioBuffer = await audioRes.arrayBuffer();

    if (provider === 'anthropic') {
      // Anthropic doesn't have a transcription endpoint — fall back to OpenAI Whisper
      // If no OpenAI key is set we return empty string rather than crashing
      const fallbackKey = process.env.OPENAI_API_KEY;
      if (!fallbackKey) {
        console.warn('[TelegramVoice] No OpenAI fallback key for transcription under Anthropic provider');
        return '';
      }
      return await whisperTranscribe(audioBuffer, fallbackKey);
    }

    return await whisperTranscribe(audioBuffer, apiKey);
  } catch (err) {
    console.error('[TelegramVoice] error:', err);
    return '';
  }
}

async function whisperTranscribe(audioBuffer: ArrayBuffer, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg');
  formData.append('model', 'gpt-4o-mini-transcribe');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body:    formData,
  });

  if (!res.ok) {
    console.error('[Whisper] error:', await res.text());
    return '';
  }
  const result = await res.json();
  return result.text ?? '';
}

// ─── DB loader ────────────────────────────────────────────────────────────────
async function getBotConfig(botId: string): Promise<IBotConfig | null> {
  await connectDB();
  return BotConfig.findById(botId).select('+authToken +webhookSecret +botToken');
}

// ─── POST — Telegram webhook ──────────────────────────────────────────────────
export async function POST(
  req:    NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const botId  = params.botId;
    const config = await getBotConfig(botId);

    if (!config || !config.isActive)
      return NextResponse.json({ ok: false }, { status: 404 });

    // Validate Telegram secret
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (config.webhookSecret && secretHeader !== config.webhookSecret)
      return NextResponse.json({ ok: false }, { status: 401 });

    const body        = await req.json();
    const telegramMsg = body?.message;
    if (!telegramMsg) return NextResponse.json({ ok: true });

    const chatId     = telegramMsg.chat.id as number;
    const sessionKey = `${botId}:${chatId}`;

    // ── Resolve AI key for this outlet ──────────────────────────────────────
    const { provider, apiKey } = await getAPIKey(config.outletId).catch(() => ({
      provider: 'openai' as const,
      apiKey:   process.env.OPENAI_API_KEY ?? '',
    }));

    let userText: string | null = null;

    if (telegramMsg.text) {
      userText = telegramMsg.text.trim();
    }

    if (telegramMsg.voice) {
      await sendChatAction(config.botToken, chatId, 'typing');
      userText = await transcribeTelegramVoice(
        telegramMsg.voice.file_id,
        config.botToken,
        apiKey,
        provider,
      );
      console.log('[TelegramVoice] transcribed:', userText);
    }

    if (!userText) return NextResponse.json({ ok: true });

    const host    = req.headers.get('host')!;
    const proto   = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;

    const intent = await classifyIntent(userText, apiKey, provider);
    console.log(`[Telegram] bot=${botId} chat=${chatId} provider=${provider} intent=${intent.category} model=${intent.model}`);

    const history = getHistory(sessionKey);

    const { message, updatedMessages } = await callAIWorker(
      userText,
      history,
      intent.model,
      baseUrl,
      config.authToken,
    );

    saveHistory(sessionKey, updatedMessages);
    await sendTelegram(config.botToken, chatId, message);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('[TelegramRouter] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── GET — Register webhook ───────────────────────────────────────────────────
export async function GET(
  req:    NextRequest,
  { params }: { params: { botId: string } },
) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('register') !== '1') return NextResponse.json({ ok: true });

  const config = await getBotConfig(params.botId);
  if (!config) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/${params.botId}`;

  const res = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:             webhookUrl,
      allowed_updates: ['message'],
      secret_token:    config.webhookSecret,
    }),
  });

  return NextResponse.json(await res.json());
}