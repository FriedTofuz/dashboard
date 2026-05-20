'use client';

import { useEffect } from 'react';
import { bootSync, flushQueue, pullAll } from '@/lib/idb/sync';
import { useUiStore } from '@/lib/store/useUiStore';

interface BootProviderProps {
  userId: string;
}

export function BootProvider({ userId }: BootProviderProps) {
  const setSyncStatus = useUiStore((s) => s.setSyncStatus);
  const setLastSyncedAt = useUiStore((s) => s.setLastSyncedAt);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;

    setSyncStatus('syncing');
    bootSync(userId)
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        teardown = unsub;
        setSyncStatus('idle');
        setLastSyncedAt(Date.now());
      })
      .catch((err) => {
        console.error('[boot] sync failed', err);
        setSyncStatus('error');
      });

    // When the tab is brought back to focus (or the window regains focus),
    // catch up on any data the realtime websocket may have missed during
    // sleep / background throttling, and flush queued writes.
    let inFlight = false;
    const catchUp = async () => {
      if (inFlight || !navigator.onLine) return;
      inFlight = true;
      try {
        setSyncStatus('syncing');
        await Promise.all([flushQueue(), pullAll(userId)]);
        setSyncStatus('idle');
        setLastSyncedAt(Date.now());
      } catch (err) {
        console.warn('[boot] catch-up sync failed', err);
        setSyncStatus('error');
      } finally {
        inFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void catchUp();
    };
    const onFocus = () => void catchUp();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      teardown?.();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, setSyncStatus, setLastSyncedAt]);

  return null;
}
