'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Day, type Task } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { addDays, todayKey } from '@/lib/time/dayKey';

interface DayHeatCell {
  day: string;
  pct: number;
  /** True when the day has at least one non-habit task or an R3 task. */
  hasContent: boolean;
  /** True when the user has explicitly logged this day via Log Day. */
  logged: boolean;
}

interface Stats {
  todayPct: number;
  weekAvgPct: number;
  /** Per-day completion stats for the last 14 days, used to draw the streak. */
  streakHeat: DayHeatCell[];
  /** Streak count: trailing run of LOGGED days that hit 100% with R3 complete. */
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

  // Pull Day records for the window so we can check logged_at per day.
  const dayRecs = useLiveQuery(
    () => {
      const db = getDb();
      // Compound PK [user_id+day_key], but we don't know userId here — pull
      // all days for this window via anyOf on day_key and let downstream
      // dedupe by day_key (per-user partitioning handled by RLS at the
      // server; locally there's one user per Dexie DB).
      return db.days.where('day_key').anyOf(windowKeys).toArray();
    },
    [currentDayKey],
    [] as Day[],
  );

  const byDay = new Map<string, Task[]>();
  for (const k of windowKeys) byDay.set(k, []);
  for (const t of tasks ?? []) {
    if (t.day_key && byDay.has(t.day_key)) byDay.get(t.day_key)!.push(t);
  }

  const loggedSet = new Set<string>();
  for (const d of dayRecs ?? []) {
    if (d.logged_at != null) loggedSet.add(d.day_key);
  }

  const heatmap: DayHeatCell[] = windowKeys.map((day) => {
    const list = byDay.get(day) ?? [];
    return {
      day,
      pct: progressForDay(list).value,
      hasContent: dayHasContent(list),
      logged: loggedSet.has(day),
    };
  });

  // Week avg only counts logged content days. Unlogged days are treated as
  // "no data" — they don't drag the average down or up.
  const weekSlice = heatmap.slice(0, 7).filter((d) => d.hasContent && d.logged);
  const weekAvgPct = weekSlice.length
    ? Math.round(weekSlice.reduce((s, d) => s + d.pct, 0) / weekSlice.length)
    : 0;

  const streakHeat = heatmap.slice(0, 14);

  // Trailing R3-complete streak — only LOGGED content days extend the
  // streak. An unlogged day is a "gap" that breaks the run. (Habit-only
  // days are still skipped silently — they neither extend nor break.)
  let streakLen = 0;
  for (let i = 0; i < streakHeat.length; i++) {
    const cell = streakHeat[i];
    if (!cell.hasContent) continue;
    if (!cell.logged) break;
    const list = byDay.get(cell.day) ?? [];
    const r3Done = list.filter((t) => t.r3_slot != null && t.state === 'done').length;
    if (r3Done === 3) streakLen += 1;
    else break;
  }

  const todayPct = heatmap[0]?.pct ?? 0;

  return { todayPct, weekAvgPct, streakHeat, streakLen, heatmap };
}

export { todayKey };
