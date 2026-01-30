'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker';

interface MainLayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Activity tracker for online status
  useActivityTracker(true);

  return (
    <>
      {/* ✅ FIXED: Proper mobile-first layout */}
      <div className="flex min-h-screen bg-[#050505]">
        <Sidebar 
          user={user} 
          onLogout={onLogout} 
          className={`fixed left-0 top-0 h-screen w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 md:block`}
        />
        
        {/* ✅ Main content area with proper mobile padding */}
        <div className="flex-1 ml-0 md:ml-64 pb-20 md:pb-0">
          {children}
        </div>
      </div>

      {/* ✅ Global mobile optimizations */}
      <style jsx global>{`
        /* Prevent iOS bounce scroll */
        body {
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }

        /* Ensure content doesn't go under bottom bar on mobile */
        @media (max-width: 768px) {
          body {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        /* Fix viewport height for mobile */
        html, body {
          height: 100%;
          height: 100dvh;
        }

        /* Smooth scroll on all devices */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </>
  );
}