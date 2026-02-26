'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
};

type AIWorkerContextType = {
  messages:     ChatMessage[];
  isOpen:       boolean;
  isLoading:    boolean;
  toggleOpen:   () => void;
  sendMessage:  (text: string) => Promise<void>;
  clearHistory: () => void;
};

const AIWorkerContext = createContext<AIWorkerContextType | null>(null);

const WELCOME: ChatMessage = {
  role:      'assistant',
  content:   "Hi! I'm your AutoCity AI assistant. I can record **sales**, **purchases**, and **expenses** — just tell me what happened.\n\nTry: *\"Sold 2 brake pads to Ahmed for QAR 150 each\"*",
  timestamp: new Date(),
};

export function AIWorkerProvider({ children }: { children: ReactNode }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [messages,    setMessages]    = useState<ChatMessage[]>([WELCOME]);
  const [apiMessages, setApiMessages] = useState<any[]>([]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      const newApiMessages = [...apiMessages, { role: 'user', content: text }];

      try {
        const res = await fetch('/api/ai-worker', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: newApiMessages }),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();

        setApiMessages(data.updatedMessages);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.message, timestamp: new Date() },
        ]);
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: new Date(), isError: true },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiMessages, isLoading]
  );

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
    setApiMessages([]);
  }, []);

  return (
    <AIWorkerContext.Provider value={{
      messages, isOpen, isLoading,
      toggleOpen:   () => setIsOpen(v => !v),
      sendMessage, clearHistory,
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
