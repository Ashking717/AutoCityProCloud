'use client';

import { useTimeBasedTheme } from "@/lib/theme/appearanceMode";
import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useAIWorker } from '@/components/ai-worker/AIWorkerProvider';

interface MainLayoutProps {
  children:  ReactNode;
  user:      any;
  onLogout:  () => void;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  useActivityTracker(true);
  const isDark = useTimeBasedTheme();
  const { setAuthenticated } = useAIWorker();
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('autocity.desktopSidebarCollapsed');
      setDesktopSidebarCollapsed(saved === 'true');
    } catch {
      setDesktopSidebarCollapsed(false);
    }
  }, []);

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('autocity.desktopSidebarCollapsed', String(next));
      } catch {
        // Sidebar still toggles even if browser storage is unavailable.
      }
      return next;
    });
  };

  // Signal auth state up to the root-level provider
  useEffect(() => {
    setAuthenticated(!!user);
    return () => setAuthenticated(false);
  }, [user, setAuthenticated]);

  return (
    <div
      className={`flex min-h-[100dvh] ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}
      style={{
        '--autocity-desktop-sidebar-width': desktopSidebarCollapsed ? '5rem' : '18rem',
        '--autocity-desktop-header-height': '10rem',
      } as CSSProperties}
      data-sidebar-collapsed={desktopSidebarCollapsed ? 'true' : 'false'}
    >
      <Sidebar
        user={user}
        onLogout={onLogout}
        desktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopCollapse={toggleDesktopSidebar}
      />
      <main
        data-autocity-main
        className="flex-1 min-w-0 ml-0 pb-20 md:pb-0 transition-[margin] duration-300 md:ml-[var(--autocity-desktop-sidebar-width)]"
      >
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
