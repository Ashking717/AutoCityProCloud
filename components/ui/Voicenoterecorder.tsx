"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Loader2,
  Volume2,
  AlertCircle,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

export interface VoiceNoteEntry {
  url: string;
  recordedByName: string;
  recordedAt: string; // ISO string
}

interface VoiceNoteRecorderProps {
  voiceNotes: VoiceNoteEntry[];
  onChange: (notes: VoiceNoteEntry[]) => void;
  recordedByName: string;  // current user's display name
  maxNotes?: number;
  label?: string;
  readOnly?: boolean;      // hides record/delete controls — for detail page
  onUploadingChange?: (uploading: boolean) => void; // lets parent block submit
}

export default function VoiceNoteRecorder({
  voiceNotes,
  onChange,
  recordedByName,
  maxNotes = 5,
  label = "Voice Notes",
  readOnly = false,
  onUploadingChange,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording]     = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingIndex, setPlayingIndex]   = useState<number | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<number, number>>({});
  const [audioProgress, setAudioProgress]   = useState<Record<number, number>>({});
  const [micError, setMicError]           = useState<string | null>(null);
  const [bars, setBars]                   = useState<number[]>(() => Array(16).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRefs        = useRef<Record<number, HTMLAudioElement>>({});
  const streamRef        = useRef<MediaStream | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(audioRefs.current).forEach((a) => a.pause());
    };
  }, []);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const step = Math.floor(dataArray.length / 16);
    setBars(
      Array.from({ length: 16 }, (_, i) => {
        const val = dataArray[i * step] || 0;
        return Math.max(4, (val / 255) * 32);
      })
    );
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = async () => {
    setMicError(null);
    if (voiceNotes.length >= maxNotes) {
      toast.error(`Maximum ${maxNotes} voice notes allowed`);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     1,       // mono — voice doesn't need stereo
          sampleRate:       16000,   // 16kHz — sufficient for speech
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000,  // 16kbps — ~10KB per 5s vs ~100KB default
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current   = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await uploadVoiceNote(blob, mimeType);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        setBars(Array(16).fill(4));
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
      animateWaveform();
    } catch {
      setMicError("Microphone access denied. Please allow mic permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }
  };

  const uploadVoiceNote = async (blob: Blob, mimeType: string) => {
    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const ext  = mimeType.includes("webm") ? "webm" : "wav";
      const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "voice");

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();

      const newEntry: VoiceNoteEntry = {
        url: data.url,
        recordedByName,
        recordedAt: new Date().toISOString(),
      };

      console.log("🎙️ VoiceNote entry to add:", JSON.stringify(newEntry));
      onChange([...voiceNotes, newEntry]);
      toast.success("Voice note saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload voice note");
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const deleteVoiceNote = (index: number) => {
    if (playingIndex === index) {
      audioRefs.current[index]?.pause();
      setPlayingIndex(null);
    }
    delete audioRefs.current[index];
    onChange(voiceNotes.filter((_, i) => i !== index));
    setAudioDurations((p) => { const n = { ...p }; delete n[index]; return n; });
    setAudioProgress((p)  => { const n = { ...p }; delete n[index]; return n; });
  };

  const togglePlay = (index: number, url: string) => {
    if (playingIndex === index) {
      audioRefs.current[index]?.pause();
      setPlayingIndex(null);
      return;
    }
    if (playingIndex !== null) {
      audioRefs.current[playingIndex]?.pause();
      setPlayingIndex(null);
    }
    if (!audioRefs.current[index]) {
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingIndex(null);
        setAudioProgress((p) => ({ ...p, [index]: 0 }));
      };
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((p) => ({
            ...p,
            [index]: (audio.currentTime / audio.duration) * 100,
          }));
        }
      };
      audio.onloadedmetadata = () => {
        setAudioDurations((p) => ({ ...p, [index]: audio.duration }));
      };
      audioRefs.current[index] = audio;
    }
    audioRefs.current[index].play().catch(() => toast.error("Playback failed"));
    setPlayingIndex(index);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[#E84545]" />
          {label}
        </label>
        {voiceNotes.length > 0 && (
          <span className="text-xs text-gray-500">
            {voiceNotes.length} / {maxNotes}
          </span>
        )}
      </div>

      {/* Mic error */}
      {micError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {micError}
        </div>
      )}

      {/* Record button — hidden when readOnly */}
      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading || voiceNotes.length >= maxNotes}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all select-none ${
              isRecording
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : voiceNotes.length >= maxNotes
                ? "bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed"
                : "bg-[#111111] border border-white/5 text-white hover:border-[#E84545]/40 hover:text-[#E84545] active:scale-95"
            } disabled:opacity-50`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : isRecording ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                Stop&nbsp;·&nbsp;{formatTime(recordingTime)}
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                {voiceNotes.length >= maxNotes ? "Limit reached" : "Record Note"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Live waveform */}
      {isRecording && (
        <div className="flex items-center gap-1 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <div className="flex items-end gap-0.5 h-8">
            {bars.map((h, i) => (
              <div
                key={`bar-${i}`}
                className="w-1 bg-red-400 rounded-full transition-all duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className="ml-3 text-xs text-red-400 font-mono">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Notes list */}
      {voiceNotes.length > 0 && (
        <div className="space-y-2">
          {voiceNotes.map((entry, index) => (
            <div
              key={entry.url}
              className="flex items-center gap-3 p-3 bg-[#111111] border border-white/5 rounded-lg group hover:border-white/10 transition-all"
            >
              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => togglePlay(index, entry.url)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#E84545]/20 text-[#E84545] hover:bg-[#E84545]/30 active:scale-95 transition-all"
              >
                {playingIndex === index ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 translate-x-0.5" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Note label + duration */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-medium">
                    Note {index + 1}
                  </span>
                  {audioDurations[index] !== undefined && (
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(audioDurations[index])}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E84545] to-[#ff6b6b] rounded-full transition-all duration-100"
                    style={{ width: `${audioProgress[index] ?? 0}%` }}
                  />
                </div>

                {/* Recorder info */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <span className="text-[11px] text-gray-300 font-medium truncate">
                    {entry.recordedByName}
                  </span>
                  <span className="text-[11px] text-gray-600">·</span>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                    {formatDate(entry.recordedAt)}
                  </span>
                </div>
              </div>

              {/* Delete — hidden in readOnly mode */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => deleteVoiceNote(index)}
                  className="flex-shrink-0 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {voiceNotes.length === 0 && !isRecording && (
        <p className="text-xs text-gray-600 italic">
          {readOnly
            ? "No voice notes recorded."
            : 'No voice notes yet. Tap "Record Note" to add one.'}
        </p>
      )}
    </div>
  );
}