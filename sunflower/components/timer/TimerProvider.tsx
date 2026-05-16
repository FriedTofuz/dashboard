'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { useTimerStore } from '@/lib/store/useTimerStore';

/**
 * Headless provider — keeps useTimerStore.tickMs in sync with the running task.
 * Must be mounted once inside the app root.
 */
export function TimerProvider() {
  const { setTick, clearTick } = useTimerStore();

  const runningTask = useLiveQuery(
    () => getDb().tasks.where('state').equals('running').first(),
    [],
  );

  useEffect(() => {
    if (!runningTask) {
      clearTick();
      return;
    }

    const update = () => {
      const elapsed =
        runningTask.elapsed_ms +
        (runningTask.started_at ? Date.now() - runningTask.started_at : 0);
      setTick(runningTask.id, elapsed);
    };

    update(); // immediate
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [runningTask, setTick, clearTick]);

  return null;
}
