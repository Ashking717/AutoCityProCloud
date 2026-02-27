import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI();

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return new Response('Missing text', { status: 400 });
  }

  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "nova",   // you can change voice
    input: text,
  });

  const audioBuffer = Buffer.from(await speech.arrayBuffer());

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}