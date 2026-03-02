'use client';

import { ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useAIWorker } from '@/components/ai-worker/AIWorkerProvider';

interface MainLayoutProps {
  children:  ReactNode;
  user:      any;
  onLogout:  () => void;
}

function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  useActivityTracker(true);
  const isDark = useTimeBasedTheme();
  const { setAuthenticated } = useAIWorker();

  // Signal auth state up to the root-level provider
  useEffect(() => {
    setAuthenticated(!!user);
    return () => setAuthenticated(false);
  }, [user, setAuthenticated]);

  return (
    <div className={`flex min-h-[100dvh] ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <Sidebar user={user} onLogout={onLogout} />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 pb-20 md:pb-0">
        {children}
      </main>

      <style>{`
        html, body {
          height: 100%;
          background-color: ${isDark ? '#000000' : '#ffffff'};
        }
        body {
          overscroll-behavior-y: none;
          overflow-x: hidden;
        }
        @media (max-width: 768px) {
          body { padding-bottom: env(safe-area-inset-bottom); }
        }
        * { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  );
}