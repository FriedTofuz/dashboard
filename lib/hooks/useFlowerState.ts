'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { computeFlowerState, consecutiveZeroR3Days } from '@/lib/compute/flowerState';
import { progressForDay } from '@/lib/compute/progress';
import { addDays } from '@/lib/time/dayKey';

/** Compute the live FlowerState from the last 3 days of tasks. */
export function useFlowerState(dayKey: string, deficitSeconds: number) {
  const recentKeys = [0, -1, -2, -3, -4, -5, -6].map((n) => addDays(dayKey, n));

  const recentTasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .anyOf(recentKeys)
        .filter((t) => !t.archived)
        .toArray(),
    [dayKey],
    [] as Task[],
  );

  const byDay = new Map<string, Task[]>();
  for (const key of recentKeys) byDay.set(key, []);
  for (const t of recentTasks ?? []) {
    if (t.day_key && byDay.has(t.day_key)) byDay.get(t.day_key)!.push(t);
  }

  const recentDays = recentKeys.slice(0, 3).map((key) => {
    const tasks = byDay.get(key) ?? [];
    const r3Done = tasks.filter((t) => t.r3_slot != null && t.state === 'done').length;
    const bonusDone = tasks.filter((t) => t.r3_slot == null && t.state === 'done').length;
    const progressPct = progressForDay(tasks).value;
    return { r3Done, bonusDone, progressPct };
  });

  // Zero-R3 streak: walk backward from today
  const zeroStreakDays = recentKeys.map((key) => ({
    r3Done: (byDay.get(key) ?? []).filter(
      (t) => t.r3_slot != null && t.state === 'done',
    ).length,
  }));

  return computeFlowerState({
    recentDays,
    currentDeficitSeconds: deficitSeconds,
    consecutiveZeroR3Days: consecutiveZeroR3Days(zeroStreakDays),
  });
}
