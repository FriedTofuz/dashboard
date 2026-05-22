'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { addDays, todayKey } from '@/lib/time/dayKey';

interface DayHeatCell {
  day: string;
  pct: number;
  /** True when the day has at least one non-habit task or an R3 task. */
  hasContent: boolean;
}

interface Stats {
  todayPct: number;
  weekAvgPct: number;
  /** Per-day completion stats for the last 14 days, used to draw the streak. */
  streakHeat: DayHeatCell[];
  /** Streak count: trailing run of days that hit 100% with R3 complete. */
  streakLen: number;
  /** Last 30 days for the mobile heatmap. */
  heatmap: DayHeatCell[];
}

const WINDOW_DAYS = 30;

/** A "counted day" is one with real task content — not habit-only. */
function dayHasContent(list: Task[]): boolean {
  return list.some((t) => t.template_id == null || t.r3_slot != null);
}

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

  const heatmap: DayHeatCell[] = windowKeys.map((day) => {
    const list = byDay.get(day) ?? [];
    return {
      day,
      pct: progressForDay(list).value,
      hasContent: dayHasContent(list),
    };
  });

  // Week / streak / heatmap intentionally ignore habit-only days so a "Gym
  // only" rest day doesn't drag the average down or break a streak.
  const weekSlice = heatmap.slice(0, 7).filter((d) => d.hasContent);
  const weekAvgPct = weekSlice.length
    ? Math.round(weekSlice.reduce((s, d) => s + d.pct, 0) / weekSlice.length)
    : 0;

  const streakHeat = heatmap.slice(0, 14);

  // Trailing R3-complete streak — keeps the existing definition but only
  // counts content days; habit-only days do NOT extend or break the streak.
  let streakLen = 0;
  for (let i = 0; i < streakHeat.length; i++) {
    const cell = streakHeat[i];
    if (!cell.hasContent) continue;
    const list = byDay.get(cell.day) ?? [];
    const r3Done = list.filter((t) => t.r3_slot != null && t.state === 'done').length;
    if (r3Done === 3) streakLen += 1;
    else break;
  }

  const todayPct = heatmap[0]?.pct ?? 0;

  return { todayPct, weekAvgPct, streakHeat, streakLen, heatmap };
}

export { todayKey };
