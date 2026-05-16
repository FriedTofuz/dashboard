'use client';

import { createClient } from '@/lib/supabase/client';
import { getDb, type Task, type HabitTemplate, type Settings } from './db';

let _flushing = false;

/** Drain the write queue into Supabase. Call after any user action or on focus. */
export async function flushQueue(): Promise<void> {
  if (_flushing) return;
  _flushing = true;

  const db = getDb();
  const supabase = createClient();

  try {
    const items = await db.write_queue.orderBy('id').limit(50).toArray();

    for (const item of items) {
      try {
        if (item.op === 'upsert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase.from(item.table as any).upsert(item.payload as any);
          if (error) throw error;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase.from(item.table as any).delete().eq('id', item.row_id);
          if (error) throw error;
        }
        await db.write_queue.delete(item.id!);
      } catch (err) {
        await db.write_queue.update(item.id!, {
          attempted_at: Date.now(),
          attempts: (item.attempts ?? 0) + 1,
        });
        console.warn('[sync] write failed, will retry', err);
      }
    }
  } finally {
    _flushing = false;
  }
}

/** Pull remote rows newer than our local max updated_at, merge into Dexie. */
export async function pullTasks(userId: string): Promise<void> {
  const db = getDb();
  const supabase = createClient();

  const localMax = await db.tasks
    .where('user_id')
    .equals(userId)
    .toArray()
    .then((rows) => Math.max(0, ...rows.map((r) => r.updated_at)));

  const since = localMax > 0 ? new Date(localMax).toISOString() : '2000-01-01T00:00:00Z';

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since);

  if (error) { console.error('[sync] pullTasks error', error); return; }

  for (const row of data ?? []) {
    const local = await db.tasks.get(row.id);
    const remoteTs = new Date(row.updated_at).getTime();
    if (!local || remoteTs > local.updated_at) {
      await db.tasks.put(remoteRowToTask(row));
    }
  }
}

/** Pull settings (including cumulative deficit). */
export async function pullSettings(userId: string): Promise<void> {
  const db = getDb();
  const supabase = createClient();

  const { data } = await supabase.from('settings').select('*').eq('user_id', userId).single();
  if (!data) return;

  await db.settings.put({
    user_id: data.user_id,
    range_window_days: data.range_window_days ?? 5,
    deficit_seconds: data.deficit_seconds ?? 0,
    push_subscription: data.push_subscription ?? null,
    reduced_motion: data.reduced_motion ?? false,
    updated_at: new Date(data.updated_at).getTime(),
  } satisfies Settings);
}

// ── helpers ────────────────────────────────────────────────────────────────

function remoteRowToTask(row: Record<string, unknown>): Task {
  return {
    id:              row.id as string,
    user_id:         row.user_id as string,
    day_key:         row.day_key as string | null,
    template_id:     row.template_id as string | null,
    title:           row.title as string,
    description:     row.description as string | undefined,
    est_minutes:     (row.est_minutes as number) ?? 25,
    state:           (row.state as Task['state']) ?? 'open',
    started_at:      row.started_at ? new Date(row.started_at as string).getTime() : null,
    elapsed_ms:      (row.elapsed_ms as number) ?? 0,
    actual_ms:       row.actual_ms as number | null,
    completed_at:    row.completed_at ? new Date(row.completed_at as string).getTime() : null,
    completion_note: row.completion_note as string | undefined,
    r3_slot:         row.r3_slot as 1 | 2 | 3 | null,
    sort_order:      (row.sort_order as number) ?? 0,
    skipped:         (row.skipped as boolean) ?? false,
    archived:        (row.archived as boolean) ?? false,
    created_at:      new Date(row.created_at as string).getTime(),
    updated_at:      new Date(row.updated_at as string).getTime(),
  };
}

// Convert HabitTemplate remote row (unused locally yet — wired in Week 2)
export function _remoteRowToHabitTemplate(row: Record<string, unknown>): HabitTemplate {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    title:            row.title as string,
    est_minutes:      (row.est_minutes as number) ?? 10,
    recurrence:       row.recurrence as HabitTemplate['recurrence'],
    recurrence_days:  row.recurrence_days as number[] | null,
    weight:           (row.weight as number) ?? 1,
    active:           (row.active as boolean) ?? true,
    sort_order:       (row.sort_order as number) ?? 0,
    created_at:       new Date(row.created_at as string).getTime(),
  };
}
