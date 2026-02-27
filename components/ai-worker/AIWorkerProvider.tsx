'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
};

export type OcrItem = {
  name:      string;
  sku:       string;
  quantity:  number;
  unitPrice: number;
  unit:      string;
  taxRate:   number;
};

type AIWorkerContextType = {
  messages:        ChatMessage[];
  isOpen:          boolean;
  isLoading:       boolean;
  ocrModalOpen:    boolean;
  isDark:          boolean;
  toggleOpen:      () => void;
  openOcrModal:    () => void;
  closeOcrModal:   () => void;
  sendMessage:     (text: string) => Promise<void>;
  sendOcrPurchase: (items: OcrItem[], supplierName?: string, invoiceNote?: string) => Promise<void>;
  clearHistory:    () => void;
};

const AIWorkerContext = createContext<AIWorkerContextType | null>(null);

const WELCOME: ChatMessage = {
  role:      'assistant',
  content:   "Hi! I'm your AutoCity AI assistant. I can record **sales**, **purchases**, and **expenses** — just tell me what happened.\n\nTry: *\"Sold 2 brake pads to Ahmed for QAR 150 each\"*",
  timestamp: new Date(),
};

/** Mirrors the exact time-based logic used across the app (dark: 18:00–06:00) */
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setIsDark(h < 6 || h >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export function AIWorkerProvider({ children }: { children: ReactNode }) {
  const isDark = useTimeBasedTheme();

  const [isOpen,       setIsOpen]       = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [messages,     setMessages]     = useState<ChatMessage[]>([WELCOME]);
  const [apiMessages,  setApiMessages]  = useState<any[]>([]);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const next = [...apiMessages, { role: 'user', content: text }];
    try {
      const res = await fetch('/api/ai-worker', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setApiMessages(data.updatedMessages);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: new Date() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [apiMessages, isLoading]);

  const sendOcrPurchase = useCallback(async (
    items: OcrItem[],
    supplierName?: string,
    invoiceNote?:  string,
  ) => {
    if (!items.length) return;
    setIsOpen(true);

    const lines = items.map((it, i) =>
      `  ${i + 1}. "${it.name}"${it.sku ? ` (SKU: ${it.sku})` : ''} — qty ${it.quantity} ${it.unit} @ QAR ${it.unitPrice.toFixed(2)}${it.taxRate ? `, tax ${it.taxRate}%` : ''}`
    ).join('\n');

    const prompt = [
      'Please record a purchase from the scanned invoice.',
      supplierName ? `Supplier: ${supplierName}` : 'Supplier is unknown — use a walk-in or ask me.',
      invoiceNote  ? `Reference: ${invoiceNote}`  : '',
      `Items:\n${lines}`,
      'Payment method: CASH (change if needed).',
      'Use these exact items, quantities and prices — do not ask to confirm them again.',
    ].filter(Boolean).join('\n');

    await sendMessage(prompt);
  }, [sendMessage]);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
    setApiMessages([]);
  }, []);

  return (
    <AIWorkerContext.Provider value={{
      messages, isOpen, isLoading, ocrModalOpen, isDark,
      toggleOpen:    () => setIsOpen(v => !v),
      openOcrModal:  () => setOcrModalOpen(true),
      closeOcrModal: () => setOcrModalOpen(false),
      sendMessage, sendOcrPurchase, clearHistory,
    }}>
      {children}
    </AIWorkerContext.Provider>
  );
}

export function useAIWorker() {
  const ctx = useContext(AIWorkerContext);
  if (!ctx) throw new Error('useAIWorker must be used within AIWorkerProvider');
  return ctx;
}