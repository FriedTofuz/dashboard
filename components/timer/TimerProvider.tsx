'use client';

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { heartbeatTimer } from '@/lib/idb/tasks';
import { useTimerStore } from '@/lib/store/useTimerStore';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Headless: keeps tickMs in sync, heartbeats every 30s, and saves on
 * visibilitychange/beforeunload so a crash loses ≤ 30s of timer.
 */
export function TimerProvider() {
  const setTick = useTimerStore((s) => s.setTick);
  const clearTick = useTimerStore((s) => s.clearTick);

  const runningTask = useLiveQuery(
    () => getDb().tasks.where('state').equals('running').first(),
    [],
  );

  const runningIdRef = useRef<string | null>(null);
  runningIdRef.current = runningTask?.id ?? null;

  // ── Tick + heartbeat ─────────────────────────────────────────────────
  useEffect(() => {
    if (!runningTask || !runningTask.started_at) {
      clearTick();
      return;
    }

    const update = () => {
      const elapsed =
        runningTask.elapsed_ms +
        (runningTask.started_at ? Date.now() - runningTask.started_at : 0);
      setTick(runningTask.id, elapsed);
    };

    update();
    const tickId = window.setInterval(update, 1000);
    const heartbeatId = window.setInterval(() => {
      void heartbeatTimer(runningTask.id);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(heartbeatId);
    };
  }, [runningTask, setTick, clearTick]);

  // ── Visibility + unload save ─────────────────────────────────────────
  useEffect(() => {
    const onHidden = () => {
      const id = runningIdRef.current;
      if (id) void heartbeatTimer(id);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHidden();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onHidden);
    window.addEventListener('pagehide', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onHidden);
      window.removeEventListener('pagehide', onHidden);
    };
  }, []);

  return null;
}
