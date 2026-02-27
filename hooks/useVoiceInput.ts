'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceMode   = 'realtime' | 'push-to-talk' | 'unavailable';
export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?:      (msg: string)  => void;
}

interface UseVoiceInputReturn {
  mode:        VoiceMode;
  status:      VoiceStatus;
  isLive:      boolean;
  isRecording: boolean;
  start:       () => void;
  stop:        () => void;
}

function supportsWebRTC(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.RTCPeerConnection !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

function bestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function useVoiceInput({
  onTranscript,
  onError,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [mode,        setMode]        = useState<VoiceMode>('unavailable');
  const [status,      setStatus]      = useState<VoiceStatus>('idle');
  const [isLive,      setIsLive]      = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const pcRef        = useRef<RTCPeerConnection | null>(null);
  const dcRef        = useRef<RTCDataChannel    | null>(null);
  const audioElRef   = useRef<HTMLAudioElement  | null>(null);
  const micStreamRef = useRef<MediaStream       | null>(null);
  const mediaRecRef  = useRef<MediaRecorder     | null>(null);
  const audioChunks  = useRef<Blob[]>([]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    ) {
      setMode('push-to-talk');
    } else if (supportsWebRTC()) {
      setMode('realtime');
    } else {
      setMode('unavailable');
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRealtime();
      stopPushToTalk();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRealtime = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    dcRef.current        = null;
    pcRef.current        = null;
    micStreamRef.current = null;
    audioElRef.current   = null;
    setIsLive(false);
    setStatus('idle');
  }, []);

  const startRealtime = useCallback(async () => {
    setStatus('connecting');
    try {
      const tokenRes = await fetch('/api/realtime');
      if (!tokenRes.ok) throw new Error('Could not get realtime session');
      const data = await tokenRes.json();
      const ephemeralKey: string = data.client_secret?.value ?? data.client_secret;
      if (!ephemeralKey) throw new Error('No ephemeral key in response');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay  = true;
      audioElRef.current = audioEl;
      pc.ontrack = e => { audioEl.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        setIsLive(true);
        setStatus('listening');
        dc.send(JSON.stringify({
          type:    'session.update',
          session: { input_audio_transcription: { model: 'whisper-1' } },
        }));
      };

      dc.onclose = () => {
        setIsLive(false);
        setStatus('idle');
      };

      dc.onerror = () => {
        onError?.('Realtime data channel error');
        stopRealtime();
      };

      dc.onmessage = async (evt) => {
        let msg: any;
        try { msg = JSON.parse(evt.data); } catch { return; }

        if (msg.type === 'response.function_call_arguments.done') {
          const toolName  = msg.name;
          const callId    = msg.call_id;
          let   toolInput: Record<string, any> = {};
          try { toolInput = JSON.parse(msg.arguments ?? '{}'); } catch { /* */ }

          let result: any = { success: false, message: 'Tool execution failed' };
          try {
            const res = await fetch('/api/realtime', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ toolName, toolInput }),
            });
            const json = await res.json();
            result = json.result ?? result;
          } catch (err) {
            console.error('[Realtime] tool fetch error', err);
          }

          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type:    'function_call_output',
              call_id: callId,
              output:  JSON.stringify(result),
            },
          }));
          dc.send(JSON.stringify({ type: 'response.create' }));
        }

        if (msg.type === 'error') {
          console.error('[Realtime] API error', msg.error);
          onError?.(msg.error?.message ?? 'Realtime API error');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          onError?.('WebRTC connection lost');
          stopRealtime();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
        {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );
      if (!sdpRes.ok) throw new Error('SDP exchange failed');
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err: any) {
      console.error('[Realtime] start failed:', err);
      stopRealtime();
      onError?.(err.message ?? 'Realtime connection failed');
      setStatus('error');
    }
  }, [onError, stopRealtime]);

  const stopPushToTalk = useCallback(() => {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }
    mediaRecRef.current = null;
    audioChunks.current = [];
    setIsRecording(false);
    setStatus('idle');
  }, []);

  const startPushToTalk = useCallback(async () => {
    if (isRecording) {
      mediaRecRef.current?.stop();
      return;
    }

    setStatus('connecting');
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = bestMimeType();
      const rec      = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecRef.current = rec;
      audioChunks.current = [];

      rec.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      rec.onstart = () => {
        setIsRecording(true);
        setStatus('listening');
      };

      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setStatus('processing');

        const blob = new Blob(audioChunks.current, { type: mimeType || 'audio/webm' });
        audioChunks.current = [];

        if (blob.size < 1000) {
          setStatus('idle');
          return;
        }

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/ai-worker/transcribe', {
            method: 'POST',
            body:   formData,
          });
          if (!res.ok) throw new Error('Transcription request failed');
          const { transcript } = await res.json() as { transcript: string };
          if (transcript?.trim()) {
            onTranscript?.(transcript.trim());
          }
        } catch (err: any) {
          console.error('[PushToTalk] transcription error', err);
          onError?.(err.message ?? 'Transcription failed');
        } finally {
          setStatus('idle');
        }
      };

      rec.onerror = () => {
        onError?.('Recording error');
        stopPushToTalk();
      };

      rec.start();
    } catch (err: any) {
      console.error('[PushToTalk] start error', err);
      onError?.(err.message ?? 'Could not access microphone');
      setStatus('error');
    }
  }, [isRecording, onTranscript, onError, stopPushToTalk]);

  const start = useCallback(() => {
    if (mode === 'realtime') {
      if (isLive) stopRealtime();
      else        startRealtime();
    } else if (mode === 'push-to-talk') {
      startPushToTalk();
    }
  }, [mode, isLive, startRealtime, stopRealtime, startPushToTalk]);

  const stop = useCallback(() => {
    if (mode === 'realtime')          stopRealtime();
    else if (mode === 'push-to-talk') stopPushToTalk();
  }, [mode, stopRealtime, stopPushToTalk]);

  return { mode, status, isLive, isRecording, start, stop };
}