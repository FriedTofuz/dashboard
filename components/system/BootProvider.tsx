'use client';

import { useEffect } from 'react';
import { bootSync, flushQueue } from '@/lib/idb/sync';
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

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void flushQueue();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      teardown?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, setSyncStatus, setLastSyncedAt]);

  return null;
}
