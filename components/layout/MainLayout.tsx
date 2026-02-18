'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker';

interface MainLayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  // Activity tracker for online status
  useActivityTracker(true);

  return (
    <>
      <div className="flex min-h-screen">
        {/*
          Sidebar renders itself as:
            - Desktop: fixed left panel (w-64, h-screen) via its own internal markup
            - Mobile:  fixed bottom nav bar + slide-up overlay via its own internal markup
          No className wiring needed here — Sidebar is fully self-contained.
        */}
        <Sidebar user={user} onLogout={onLogout} />

        {/*
          ml-0 md:ml-64   → on mobile the sidebar is a bottom bar, not a left panel
          pb-20 md:pb-0   → mobile bottom nav bar is ~80px tall; prevent content hiding behind it
          min-w-0         → flex child must be told it can shrink, prevents overflow bugs
        */}
        <main className="flex-1 min-w-0 ml-0 md:ml-64 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <style jsx global>{`
        /* Prevent iOS rubber-band bounce */
        body {
          overscroll-behavior-y: none;
        }

        /* Account for iPhone home indicator */
        @media (max-width: 768px) {
          body {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        /* Use dynamic viewport height so mobile chrome/safari bars are handled */
        html, body {
          height: 100dvh;
        }

        /* Hardware-accelerated scrolling on iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </>
  );
}