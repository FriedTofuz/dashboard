'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { addDays } from '@/lib/time/dayKey';

export interface LongTermStats {
  monthAvgPct: number;
  yearAvgPct: number;
  allTimeAvgPct: number;
  /** Number of distinct logged days. Used to gate empty-state displays. */
  daysLogged: number;
}

/** Average daily progress over the trailing N days, considering only days
 *  that had ≥ 1 scheduled task (so empty days don't drag the average down). */
function avgOverWindow(byDay: Map<string, Task[]>, anchorKey: string, windowDays: number): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < windowDays; i++) {
    const key = addDays(anchorKey, -i);
    const list = byDay.get(key);
    if (!list || list.length === 0) continue;
    sum += progressForDay(list).value;
    count++;
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

export function useLongTermStats(userId: string, anchorKey: string): LongTermStats {
  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('user_id')
        .equals(userId)
        .filter((t) => !t.archived && t.day_key != null)
        .toArray(),
    [userId],
    [] as Task[],
  );

  const byDay = new Map<string, Task[]>();
  for (const t of tasks ?? []) {
    if (!t.day_key) continue;
    let list = byDay.get(t.day_key);
    if (!list) { list = []; byDay.set(t.day_key, list); }
    list.push(t);
  }

  const monthAvgPct = avgOverWindow(byDay, anchorKey, 30);
  const yearAvgPct = avgOverWindow(byDay, anchorKey, 365);

  // All-time: every distinct day that had tasks.
  let sum = 0;
  let count = 0;
  byDay.forEach((list) => {
    if (list.length === 0) return;
    sum += progressForDay(list).value;
    count++;
  });
  const allTimeAvgPct = count > 0 ? Math.round(sum / count) : 0;

  return {
    monthAvgPct,
    yearAvgPct,
    allTimeAvgPct,
    daysLogged: count,
  };
}
