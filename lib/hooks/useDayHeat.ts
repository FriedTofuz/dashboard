'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Day, type Task } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';

export interface DayHeatCell {
  day: string;
  pct: number;
  hasContent: boolean;
  logged: boolean;
  away: boolean;
}

function dayHasContent(list: Task[]): boolean {
  return list.some((t) => t.template_id == null || t.r3_slot != null);
}

/** Compute per-day progress cells for an arbitrary set of day keys. Returns
 *  one cell per key, in the same order. Live: re-runs when the underlying
 *  tasks or days tables change. */
export function useDayHeat(dayKeys: string[]): DayHeatCell[] {
  const sortedKeys = [...dayKeys].sort();
  const cacheKey = sortedKeys.join(',');

  const tasks = useLiveQuery(
    () =>
      sortedKeys.length === 0
        ? Promise.resolve([] as Task[])
        : getDb()
            .tasks.where('day_key')
            .anyOf(sortedKeys)
            .filter((t) => !t.archived)
            .toArray(),
    [cacheKey],
    [] as Task[],
  );

  const dayRecs = useLiveQuery(
    () =>
      sortedKeys.length === 0
        ? Promise.resolve([] as Day[])
        : getDb().days.where('day_key').anyOf(sortedKeys).toArray(),
    [cacheKey],
    [] as Day[],
  );

  const byDay = new Map<string, Task[]>();
  for (const k of dayKeys) byDay.set(k, []);
  for (const t of tasks ?? []) {
    if (t.day_key && byDay.has(t.day_key)) byDay.get(t.day_key)!.push(t);
  }

  const loggedSet = new Set<string>();
  const awaySet = new Set<string>();
  for (const d of dayRecs ?? []) {
    if (d.logged_at != null) loggedSet.add(d.day_key);
    if (d.away) awaySet.add(d.day_key);
  }

  return dayKeys.map((day) => {
    const list = byDay.get(day) ?? [];
    return {
      day,
      pct: progressForDay(list).value,
      hasContent: dayHasContent(list),
      logged: loggedSet.has(day),
      away: awaySet.has(day),
    };
  });
}
