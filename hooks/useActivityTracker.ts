// hooks/useActivityTracker.ts
'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to track user activity and send heartbeat to server
 * This keeps the user's "online" status updated
 */
export function useActivityTracker(enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const sendHeartbeat = async () => {
    try {
      await fetch('/api/users/activity', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to send activity heartbeat:', error);
    }
  };

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!enabled) return;

    // Track user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 2 minutes
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 2 * 60 * 1000);

    // Send heartbeat before page unload
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/users/activity', JSON.stringify({}));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  return { sendHeartbeat };
}