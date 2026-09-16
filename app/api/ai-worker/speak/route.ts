import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { getAIClient } from '@/lib/ai-worker/getAIClient';

export async function POST(req: NextRequest) {
  const token = cookies().get('auth-token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user: ReturnType<typeof verifyToken>;
  try {
    user = verifyToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

  const { text } = await req.json();

  if (!text?.trim() || text.length > 4096) {
    return new Response('Missing text', { status: 400 });
  }

  try {
    const resolved = await getAIClient(user.outletId);
    if (resolved.provider !== 'openai') {
      return NextResponse.json({ error: 'Speech requires an OpenAI provider configuration' }, { status: 400 });
    }
    const speech = await resolved.client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: text.trim(),
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: any) {
    console.error('[Speech] generation failed:', error);
    return NextResponse.json({ error: error.message || 'Speech generation failed' }, { status: 500 });
  }
}
