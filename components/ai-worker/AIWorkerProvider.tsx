'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AIProvider = 'openai' | 'anthropic' | null;

export type ChatMessage = {
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  isError?:  boolean;
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
  // Chat state
  messages:         ChatMessage[];
  isOpen:           boolean;
  isLoading:        boolean;
  ocrModalOpen:     boolean;

  // Theme
  isDark:           boolean;

  // Auth / provider
  isAuthenticated:  boolean;
  isWidgetEnabled:  boolean;
  activeProvider:   AIProvider;

  // Actions
  setAuthenticated: (v: boolean) => void;
  refreshProvider:  () => void;
  toggleOpen:       () => void;
  openOcrModal:     () => void;
  closeOcrModal:    () => void;
  sendMessage:      (text: string, model?: string) => Promise<void>;
  sendOcrPurchase:  (items: OcrItem[], supplierName?: string, invoiceNote?: string) => Promise<void>;
  clearHistory:     () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AIWorkerContext = createContext<AIWorkerContextType | null>(null);

// ─── Welcome message ──────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  role:      'assistant',
  content:   "Hi! I'm your AutoCity AI assistant. I can record **sales**, **purchases**, and **expenses** — just tell me what happened.\n\nTry: *\"Sold 2 brake pads to Ahmed for QAR 150 each\"*",
  timestamp: new Date(),
};

// ─── Time-based theme ─────────────────────────────────────────────────────────
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AIWorkerProvider({ children }: { children: ReactNode }) {
  const isDark = useTimeBasedTheme();

  // Chat UI state
  const [isOpen,       setIsOpen]       = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [messages,     setMessages]     = useState<ChatMessage[]>([WELCOME]);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

  // Raw API history kept in a ref to avoid stale closures in sendMessage
  const apiHistoryRef = useRef<any[]>([]);

  // Auth + provider
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(false);
  const [activeProvider,  setActiveProvider]  = useState<AIProvider>(null);
  const [providerTick,    setProviderTick]     = useState(0);

  // ── Fetch provider status on auth change or explicit refresh ─────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setIsWidgetEnabled(false);
      setActiveProvider(null);
      return;
    }
    fetch('/api/ai-provider', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { configs: [] })
      .then((data: { configs: any[] }) => {
        const active = data.configs?.find((c: any) => c.isActive);
        setIsWidgetEnabled(active?.widgetEnabled === true);
        setActiveProvider(active?.provider ?? null);
      })
      .catch(() => {
        setIsWidgetEnabled(false);
        setActiveProvider(null);
      });
  }, [isAuthenticated, providerTick]);

  // ── Primitive actions ─────────────────────────────────────────────────────────
  const setAuthenticated = useCallback((v: boolean) => setIsAuthenticated(v), []);
  const refreshProvider  = useCallback(() => setProviderTick(t => t + 1), []);
  const toggleOpen       = useCallback(() => setIsOpen(v => !v), []);
  const openOcrModal     = useCallback(() => setOcrModalOpen(true),  []);
  const closeOcrModal    = useCallback(() => setOcrModalOpen(false), []);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
    apiHistoryRef.current = [];
  }, []);

  // ── sendMessage ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, model?: string) => {
    if (!text.trim() || isLoading) return;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date() },
    ]);
    setIsLoading(true);

    const next = [...apiHistoryRef.current, { role: 'user', content: text }];

    try {
      const res = await fetch('/api/ai-worker', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ messages: next, model }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Persist returned history (sanitised by the server)
      apiHistoryRef.current = data.updatedMessages ?? [
        ...next,
        { role: 'assistant', content: data.message },
      ];

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: new Date() },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role:      'assistant',
          content:   err.message || 'Something went wrong. Please try again.',
          timestamp: new Date(),
          isError:   true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // ── sendOcrPurchase ───────────────────────────────────────────────────────────
  const sendOcrPurchase = useCallback(async (
    items:         OcrItem[],
    supplierName?: string,
    invoiceNote?:  string,
  ) => {
    if (!items.length) return;
    setIsOpen(true);

    const lines = items
      .map((it, i) =>
        `  ${i + 1}. "${it.name}"${it.sku ? ` (SKU: ${it.sku})` : ''} — qty ${it.quantity} ${it.unit} @ QAR ${it.unitPrice.toFixed(2)}${it.taxRate ? `, tax ${it.taxRate}%` : ''}`
      )
      .join('\n');

    const prompt = [
      'Please record a purchase from the scanned invoice.',
      supplierName ? `Supplier: ${supplierName}` : 'Supplier is unknown — use a walk-in or ask me.',
      invoiceNote  ? `Reference: ${invoiceNote}`  : '',
      `Items:\n${lines}`,
      'Payment method: CASH (change if needed).',
      'Use these exact items, quantities and prices — do not ask to confirm them again.',
    ]
      .filter(Boolean)
      .join('\n');

    // Use provider-aware default model
    const defaultModel = activeProvider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-5-mini';
    await sendMessage(prompt, defaultModel);
  }, [sendMessage, activeProvider]);

  return (
    <AIWorkerContext.Provider
      value={{
        messages, isOpen, isLoading, ocrModalOpen, isDark,
        isAuthenticated, isWidgetEnabled, activeProvider,
        setAuthenticated, refreshProvider,
        toggleOpen, openOcrModal, closeOcrModal,
        sendMessage, sendOcrPurchase, clearHistory,
      }}
    >
      {children}
    </AIWorkerContext.Provider>
  );
}

export function useAIWorker() {
  const ctx = useContext(AIWorkerContext);
  if (!ctx) throw new Error('useAIWorker must be used within AIWorkerProvider');
  return ctx;
}