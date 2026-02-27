"use client";

/**
 * useRealtimeERP
 *
 * Manages the full lifecycle of an OpenAI Realtime session:
 *   1. Fetches an ephemeral key from GET /api/realtime
 *   2. Opens a WebRTC data-channel + audio track to the Realtime API
 *   3. Forwards every function_call event to POST /api/realtime for server-side execution
 *   4. Sends the tool result back to the model as a function_call_output item
 *   5. Exposes start / stop / status to the UI
 *
 * Usage:
 *   const { status, start, stop, transcript } = useRealtimeERP();
 */

import { useCallback, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface TranscriptEntry {
  role:    "user" | "assistant";
  text:    string;
  ts:      number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useRealtimeERP() {
  const [status,     setStatus]     = useState<RealtimeStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error,      setError]      = useState<string | null>(null);

  const pcRef  = useRef<RTCPeerConnection | null>(null);
  const dcRef  = useRef<RTCDataChannel    | null>(null);
  const streamRef = useRef<MediaStream   | null>(null);

  // ── Send a raw event to the Realtime API over the data channel ───────────────
  const send = useCallback((event: object) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  // ── Append to transcript ─────────────────────────────────────────────────────
  const appendTranscript = useCallback((role: "user" | "assistant", text: string) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  // ── Handle incoming data-channel messages ────────────────────────────────────
  const handleEvent = useCallback(async (raw: string) => {
    let event: any;
    try { event = JSON.parse(raw); } catch { return; }

    switch (event.type) {

      // ── Model wants to call a tool ───────────────────────────────────────────
      case "response.function_call_arguments.done": {
        const toolName  = event.name;
        const callId    = event.call_id;
        let   toolInput: Record<string, any> = {};

        try { toolInput = JSON.parse(event.arguments ?? "{}"); } catch { /* */ }

        console.log("[Realtime] tool call →", toolName, toolInput);

        // Execute on the server (auth, DB, GL — all handled there)
        let result: any = { success: false, message: "Tool execution failed" };
        try {
          const res = await fetch("/api/realtime", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ toolName, toolInput }),
          });
          const json = await res.json();
          result = json.result ?? result;
        } catch (err) {
          console.error("[Realtime] tool fetch error", err);
        }

        // Send the result back to the model
        send({
          type: "conversation.item.create",
          item: {
            type:    "function_call_output",
            call_id: callId,
            output:  JSON.stringify(result),
          },
        });

        // Ask the model to continue generating after the tool result
        send({ type: "response.create" });
        break;
      }

      // ── Collect assistant transcript ─────────────────────────────────────────
      case "response.audio_transcript.done": {
        if (event.transcript) {
          appendTranscript("assistant", event.transcript);
        }
        break;
      }

      // ── Collect user transcript (if input_audio_transcription is enabled) ────
      case "conversation.item.input_audio_transcription.completed": {
        if (event.transcript) {
          appendTranscript("user", event.transcript);
        }
        break;
      }

      // ── Errors ───────────────────────────────────────────────────────────────
      case "error": {
        console.error("[Realtime] API error", event.error);
        setError(event.error?.message ?? "Realtime API error");
        break;
      }

      default:
        break;
    }
  }, [send, appendTranscript]);

  // ── Start session ────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      // 1. Get ephemeral key from our server
      const sessionRes = await fetch("/api/realtime");
      if (!sessionRes.ok) throw new Error("Failed to get realtime session");
      const session = await sessionRes.json();
      const ephemeralKey: string = session.client_secret?.value ?? session.client_secret;

      // 2. Get user microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Play remote audio (model speech) through a hidden <audio> element
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = e => { audioEl.srcObject = e.streams[0]; };

      // 5. Add local mic track
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 6. Open data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = e => handleEvent(e.data);

      dc.onopen  = () => {
        setStatus("connected");
        console.log("[Realtime] data channel open");

        // Enable user speech transcription
        send({
          type:   "session.update",
          session: {
            input_audio_transcription: { model: "whisper-1" },
          },
        });
      };

      dc.onclose = () => setStatus("disconnected");

      // 7. SDP offer → OpenAI → SDP answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) throw new Error("WebRTC SDP exchange failed");

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (err: any) {
      console.error("[Realtime] start error", err);
      setError(err.message ?? "Failed to start session");
      setStatus("error");
      stop();
    }
  }, [handleEvent, send]);

  // ── Stop session ─────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());

    dcRef.current   = null;
    pcRef.current   = null;
    streamRef.current = null;

    setStatus("disconnected");
  }, []);

  return { status, transcript, error, start, stop };
}