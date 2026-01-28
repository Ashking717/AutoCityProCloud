// hooks/useVoiceRecorder.ts
'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef(false);

  const clearTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      isResettingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Ignore late async stop after reset/send
        if (isResettingRef.current) {
          cleanupStream();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);

        cleanupStream();
      };

      recorder.start();
      setIsRecording(true);
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && isRecording) {
      recorder.stop();
      setIsRecording(false);
      clearTimer();
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    isResettingRef.current = true;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    clearTimer();
    cleanupStream();

    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
  }, []);

  // ✅ CALL THIS AFTER SENDING VOICE MESSAGE
  const reset = useCallback(() => {
    isResettingRef.current = true;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    clearTimer();
    cleanupStream();

    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    error,
  };
}
