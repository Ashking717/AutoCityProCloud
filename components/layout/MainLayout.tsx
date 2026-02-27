'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { AIWorkerProvider } from '@/components/ai-worker/AIWorkerProvider';
import { AIWorkerWidget }   from '@/components/ai-worker/AIWorkerWidget';

interface MainLayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
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

// ── Draggable floating wrapper (mobile only) ──────────────────────────────────
function DraggableFloat({ children }: { children: ReactNode }) {
  const BUTTON_SIZE  = 56;
  const EDGE_MARGIN  = 12;
  const OPACITY_IDLE = 0.45;

  const [pos, setPos]         = useState<{ x: number; y: number } | null>(null);
  const [opacity, setOpacity] = useState(OPACITY_IDLE);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef   = useRef(false);
  const startRef  = useRef({ px: 0, py: 0, ex: 0, ey: 0 });
  const posRef    = useRef({ x: 0, y: 0 });
  const rafRef    = useRef<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elRef     = useRef<HTMLDivElement | null>(null);

  // Initialise bottom-right corner
  useEffect(() => {
    const init = () => {
      const x = window.innerWidth  - BUTTON_SIZE - EDGE_MARGIN;
      const y = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN - 80;
      posRef.current = { x, y };
      setPos({ x, y });
    };
    init();
    window.addEventListener('resize', init);
    return () => window.removeEventListener('resize', init);
  }, []);

  // Snap to nearest vertical edge
  const snapToEdge = (x: number, y: number) => {
    const maxX = window.innerWidth  - BUTTON_SIZE - EDGE_MARGIN;
    const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
    const snappedX = x < window.innerWidth / 2 ? EDGE_MARGIN : maxX;
    const clampedY = Math.max(EDGE_MARGIN + 64, Math.min(y, maxY));
    return { x: snappedX, y: clampedY };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current  = false;
    setIsDragging(false);
    startRef.current = {
      px: touch.clientX,
      py: touch.clientY,
      ex: posRef.current.x,
      ey: posRef.current.y,
    };
    setOpacity(1);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx    = touch.clientX - startRef.current.px;
    const dy    = touch.clientY - startRef.current.py;

    if (!dragRef.current && Math.hypot(dx, dy) < 6) return;
    dragRef.current = true;
    setIsDragging(true);
    e.preventDefault();

    const maxX = window.innerWidth  - BUTTON_SIZE - EDGE_MARGIN;
    const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
    const nx   = Math.max(EDGE_MARGIN, Math.min(startRef.current.ex + dx, maxX));
    const ny   = Math.max(EDGE_MARGIN + 64, Math.min(startRef.current.ey + dy, maxY));

    posRef.current = { x: nx, y: ny };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setPos({ ...posRef.current }));
  };

  const onTouchEnd = () => {
    if (dragRef.current) {
      const snapped = snapToEdge(posRef.current.x, posRef.current.y);
      posRef.current = snapped;
      setPos(snapped);
    }
    setIsDragging(false);
    timerRef.current = setTimeout(() => setOpacity(OPACITY_IDLE), 1800);
  };

  if (!pos) return null;

  return (
    <div
      ref={elRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position:    'fixed',
        left:         pos.x,
        top:          pos.y,
        zIndex:       9999,
        opacity,
        transition:   isDragging
          ? 'opacity 0.15s'
          : 'left 0.28s cubic-bezier(.25,.46,.45,.94), top 0.28s cubic-bezier(.25,.46,.45,.94), opacity 0.4s',
        touchAction:  'none',
        userSelect:   'none',
        willChange:   'left, top',
      }}
    >
      {children}
    </div>
  );
}

export default function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  useActivityTracker(true);
  const isDark    = useTimeBasedTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <AIWorkerProvider>
      <div className={`flex min-h-[100dvh] ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <Sidebar user={user} onLogout={onLogout} />
        <main className="flex-1 min-w-0 ml-0 md:ml-64 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {isMobile ? (
        <DraggableFloat>
          <AIWorkerWidget />
        </DraggableFloat>
      ) : (
        <AIWorkerWidget />
      )}

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
    </AIWorkerProvider>
  );
}