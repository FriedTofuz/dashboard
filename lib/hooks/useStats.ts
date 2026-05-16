'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { addDays, todayKey } from '@/lib/time/dayKey';

interface Stats {
  todayPct: number;
  weekAvgPct: number;
  streakDays: boolean[];          // last 14 days, true = R3 fully done that day
  heatmap: Array<{ day: string; pct: number }>;  // last 30 days
}

const WINDOW_DAYS = 30;

export function useStats(currentDayKey: string): Stats {
  const windowKeys = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    addDays(currentDayKey, -i),
  );

  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .anyOf(windowKeys)
        .filter((t) => !t.archived)
        .toArray(),
    [currentDayKey],
    [] as Task[],
  );

  const byDay = new Map<string, Task[]>();
  for (const k of windowKeys) byDay.set(k, []);
  for (const t of tasks ?? []) {
    if (t.day_key && byDay.has(t.day_key)) byDay.get(t.day_key)!.push(t);
  }

  const heatmap = windowKeys.map((day) => {
    const list = byDay.get(day) ?? [];
    return { day, pct: progressForDay(list).value };
  });

  // 7-day average — only count days that had at least one task scheduled
  const weekSlice = heatmap.slice(0, 7).filter((d) => (byDay.get(d.day) ?? []).length > 0);
  const weekAvgPct = weekSlice.length
    ? Math.round(weekSlice.reduce((s, d) => s + d.pct, 0) / weekSlice.length)
    : 0;

  // Streak: last 14 days, R3 fully complete that day
  const streakDays = Array.from({ length: 14 }, (_, i) => {
    const day = windowKeys[i];
    const list = byDay.get(day) ?? [];
    const r3Done = list.filter((t) => t.r3_slot != null && t.state === 'done').length;
    return r3Done === 3;
  });

  const todayPct = heatmap[0]?.pct ?? 0;

  return { todayPct, weekAvgPct, streakDays, heatmap };
}

export { todayKey };
