import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { getAIClient } from '@/lib/ai-worker/getAIClient';

export const maxDuration = 30;
export const runtime     = 'nodejs';

/**
 * POST /api/ai-worker/transcribe
 *
 * Push-to-talk fallback transcription endpoint.
 * Receives a raw audio blob (WebM/OGG/MP4) recorded by MediaRecorder,
 * sends it to OpenAI Whisper, and returns the cleaned transcript.
 *
 * Used only when WebRTC Realtime is unavailable (Firefox, Safari, or
 * when the ephemeral key fetch fails and the hook downgrades to push-to-talk).
 *
 * Primary path is WebRTC Realtime which never hits this endpoint.
 */
export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = cookies().get('auth-token')?.value;
  if (!token)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let user: ReturnType<typeof verifyToken>;
  try { user = verifyToken(token); }
  catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }
  if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

  // ── Parse multipart form ──────────────────────────────────────────────────
  let audioBlob: Blob;
  let filename  = 'recording.webm';

  try {
    const formData = await request.formData();
    const file     = formData.get('audio');

    if (!file || typeof file === 'string')
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });

    audioBlob = file as Blob;
    filename  = (file as File).name ?? filename;

  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  if (audioBlob.size < 500)
    return NextResponse.json({ transcript: '' }); // silence / too short

  if (audioBlob.size > 25 * 1024 * 1024)
    return NextResponse.json({ error: 'Audio too large (max 25 MB)' }, { status: 413 });

  // ── Whisper transcription ─────────────────────────────────────────────────
  try {
    const resolved = await getAIClient(user.outletId);
    if (resolved.provider !== 'openai') {
      return NextResponse.json({ error: 'Transcription requires an OpenAI provider configuration' }, { status: 400 });
    }
    const transcription = await resolved.client.audio.transcriptions.create({
      model:    'gpt-4o-transcribe',
      file:     new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' }),
      // Language hint — Whisper auto-detects, but we can bias it
      // toward the three languages used in this ERP.
      // Omitting `language` gives best multilingual / code-switch results.
      prompt:
        'AutoCity ERP. The user may speak English, Malayalam (മലയാളം), or Arabic (العربية), ' +
        'or mix English with Malayalam or Arabic. Common terms: sale, purchase, expense, ' +
        'invoice, stock, supplier, customer, tyres, parts, quantity, cash, credit.',
      response_format: 'text',
    });

    const transcript = (transcription as unknown as string).trim();

    if (!transcript)
      return NextResponse.json({ transcript: '' });

    return NextResponse.json({ transcript });

  } catch (err: any) {
    console.error('[TranscribeAudio] Whisper error:', err);
    return NextResponse.json(
      { error: err.message || 'Transcription failed' },
      { status: 500 },
    );
  }
}
