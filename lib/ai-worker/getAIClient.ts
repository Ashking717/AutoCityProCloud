// lib/ai-worker/getAIClient.ts
//
// Drop-in replacement for `new OpenAI()` / `new Anthropic()`.
// Reads the active provider config from the DB for the given outletId.
// Falls back to env vars so local dev still works without a DB entry.

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/db/mongodb';
import AIProviderConfig, { AIProvider } from '@/lib/models/AiProviderConfig';

export type ResolvedClient =
  | { provider: 'openai';     client: OpenAI;     apiKey: string }
  | { provider: 'anthropic';  client: Anthropic;  apiKey: string };

/**
 * Returns the active AI client for the given outlet.
 * Priority: DB config → env vars.
 */
export async function getAIClient(outletId: string): Promise<ResolvedClient> {
  await connectDB();

  const config = await AIProviderConfig
    .findOne({ outletId, isActive: true })
    .select('+apiKey')   // ← opt-in to the hidden field
    .lean() as { provider: string; apiKey: string } | null;

  if (config?.apiKey) {
    if (config.provider === 'anthropic') {
      return {
        provider: 'anthropic',
        client:   new Anthropic({ apiKey: config.apiKey }),
        apiKey:   config.apiKey,
      };
    }
    // Default / openai
    return {
      provider: 'openai',
      client:   new OpenAI({ apiKey: config.apiKey }),
      apiKey:   config.apiKey,
    };
  }

  // ── Fallback: environment variables ──────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      client:   new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      apiKey:   process.env.ANTHROPIC_API_KEY,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      client:   new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      apiKey:   process.env.OPENAI_API_KEY,
    };
  }

  throw new Error(
    'No AI provider configured. Add a key in Settings → AI Provider, ' +
    'or set OPENAI_API_KEY / ANTHROPIC_API_KEY in your environment.',
  );
}

/**
 * Convenience: returns just the raw API key for non-SDK callers
 * (e.g. the Telegram route that calls fetch() directly).
 */
export async function getAPIKey(outletId: string): Promise<{ provider: AIProvider; apiKey: string }> {
  const { provider, apiKey } = await getAIClient(outletId);
  return { provider, apiKey };
}