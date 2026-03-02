'use client';

import { useEffect, useState } from 'react';
import { useAIWorker } from './AIWorkerProvider';
import { AIWorkerWidget } from './AIWorkerWidget';
import { DraggableFloat } from './DraggableFloat';

export function AIWorkerWidgetPortal() {
  const { isAuthenticated } = useAIWorker();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isAuthenticated) return null;

  return isMobile ? (
    <DraggableFloat>
      <AIWorkerWidget />
    </DraggableFloat>
  ) : (
    <AIWorkerWidget />
  );
}