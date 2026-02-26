'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIWorker } from './AIWorkerProvider';
import {
  Sparkles, X, Send, RotateCcw, Mic, MicOff,
  ShoppingCart, Truck, Receipt, BarChart3, Package, ChevronDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ── Markdown-lite: **bold** renderer ─────────────────────────────────────────
function renderMessage(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={li}>
        {parts.map((p, i) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>
        )}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ── Voice hook using Web Speech API (no upload needed) ───────────────────────
function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveText,    setLiveText]    = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang           = 'en-US';
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsListening(true); setLiveText(''); };

    recognition.onresult = (e: any) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setLiveText(interim || final);
      if (final) { onTranscript(final.trim()); setLiveText(''); }
    };

    recognition.onerror  = () => { setIsListening(false); setLiveText(''); };
    recognition.onend    = () => { setIsListening(false); setLiveText(''); };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setLiveText('');
  }, []);

  return { isListening, isSupported, liveText, start, stop };
}

// ── Quick actions ──────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: ShoppingCart, label: 'New Sale',     prompt: 'I need to record a sale' },
  { icon: Truck,        label: 'New Purchase', prompt: 'I need to record a purchase from a supplier' },
  { icon: Receipt,      label: 'New Expense',  prompt: 'I need to record an expense' },
  { icon: Package,      label: 'Add Product',  prompt: 'I want to add a new product to inventory' },
  { icon: BarChart3,    label: "Today's Summary", prompt: "Show me today's summary of sales, purchases and expenses" },
];

// ── Widget ─────────────────────────────────────────────────────────────────────
export function AIWorkerWidget() {
  const { messages, isOpen, isLoading, toggleOpen, sendMessage, clearHistory } = useAIWorker();
  const [input,     setInput]     = useState('');
  const [showClear, setShowClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Voice: append transcript to input
  const handleTranscript = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  const { isListening, isSupported, liveText, start: startVoice, stop: stopVoice } =
    useVoiceInput(handleTranscript);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  };

  const toggleVoice = () => isListening ? stopVoice() : startVoice();

  const hasConversation = messages.length > 1;

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-5 z-50 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 group
          ${isOpen
            ? 'bg-zinc-800 border border-zinc-700'
            : 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 shadow-blue-900/50'
          }`}
        style={{ width: 52, height: 52 }}
        title="AutoCity AI Assistant"
      >
        {isOpen
          ? <X size={20} className="text-zinc-300" />
          : <Sparkles size={22} className="text-white group-hover:scale-110 transition-transform" />
        }
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl border-2 border-blue-400 opacity-40 animate-ping" />
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-[72px] right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
          style={{
            width: 390,
            height: 570,
            background: 'linear-gradient(135deg, #0d0d0d 0%, #111111 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Sparkles size={15} className={`text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">AutoCity AI</p>
                <p className="text-xs mt-0.5">
                  {isListening
                    ? <span className="text-red-400 animate-pulse">● Listening…</span>
                    : isLoading
                      ? <span className="text-blue-400 animate-pulse">Working…</span>
                      : <span className="text-zinc-500">Ready</span>
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasConversation && (
                <button
                  onClick={() => setShowClear(c => !c)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  title="Clear chat"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={toggleOpen}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Clear confirm bar */}
          {showClear && (
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-zinc-400">Clear conversation?</span>
              <div className="flex gap-2">
                <button onClick={() => setShowClear(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                <button onClick={() => { clearHistory(); setShowClear(false); }} className="text-red-400 hover:text-red-300 transition-colors font-medium">Clear</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Sparkles size={11} className="text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-950/50 text-red-300 border border-red-900/50 rounded-bl-sm'
                        : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-bl-sm'
                    }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {renderMessage(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Sparkles size={11} className="text-blue-400 animate-spin" />
                </div>
                <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
                  {[0, 1, 2].map(n => (
                    <span key={n} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${n * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Live voice transcript */}
            {isListening && liveText && (
              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm bg-blue-600/30 border border-blue-500/40 text-blue-200 italic">
                  {liveText}…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick actions */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all
                    bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <Icon size={11} />{label}
                </button>
              ))}
            </div>
          )}

          {/* Voice status banner */}
          {isListening && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-xs text-red-300 flex-1">Listening — speak your command…</span>
              <button onClick={stopVoice} className="text-xs text-red-400 hover:text-red-200 font-medium">Done</button>
            </div>
          )}

          {/* Input bar */}
          <div className="px-3 py-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isListening ? 'Listening…' : 'e.g. Sold 3 tyres to Ahmed for 200 each…'}
              disabled={isLoading}
              className="flex-1 text-sm bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3.5 py-2.5
                text-zinc-100 placeholder-zinc-600 outline-none
                focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20
                disabled:opacity-50 transition-colors"
            />

            {/* Voice button — only render if supported */}
            {isSupported && (
              <button
                onClick={toggleVoice}
                disabled={isLoading}
                title={isListening ? 'Stop listening' : 'Voice command'}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isListening
                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/40 animate-pulse'
                    : 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600'
                  }`}
              >
                {isListening
                  ? <MicOff size={16} className="text-white" />
                  : <Mic    size={16} className="text-zinc-300" />
                }
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                hover:shadow-lg hover:shadow-blue-900/40"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
