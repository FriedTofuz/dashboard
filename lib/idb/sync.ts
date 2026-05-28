'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  getDb,
  type Task,
  type HabitTemplate,
  type Day,
  type NotepadPage,
  type Password,
  type Settings,
} from './db';

let _flushing = false;

/** Drain the write queue into Supabase. */
export async function flushQueue(): Promise<void> {
  if (_flushing) return;
  _flushing = true;

  const db = getDb();
  const supabase = createClient();

  try {
    while (true) {
      const items = await db.write_queue.orderBy('id').limit(50).toArray();
      if (items.length === 0) break;

      let progress = false;
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
          progress = true;
        } catch (err) {
          await db.write_queue.update(item.id!, {
            attempted_at: Date.now(),
            attempts: (item.attempts ?? 0) + 1,
          });
          console.warn('[sync] write failed, will retry', err);
        }
      }
      if (!progress) break;
    }
  } finally {
    _flushing = false;
  }
}

// ── Pullers ────────────────────────────────────────────────────────────────
//
// Note: pulls intentionally fetch ALL rows for the user (no `updated_at >
// since` watermark). The previous watermark used the local max(updated_at),
// but `updated_at` is client-supplied — so a device with a fast clock would
// set a high watermark, then filter out rows written by other devices whose
// (correct) clocks produced lower timestamps. That caused one-way sync.
// Data volume per user is small enough that pulling the full set every time
// is the safer choice. Per-row LWW conflict resolution still avoids
// clobbering newer local edits.

async function pullTable<T>(
  table: 'tasks' | 'habit_templates' | 'days' | 'notepad_pages',
  userId: string,
  toLocal: (row: Record<string, unknown>) => T,
  getId: (row: T) => string,
  getUpdatedAt: (row: T) => number,
  put: (row: T) => Promise<unknown>,
): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn(`[sync] pull ${table} failed`, error);
    return;
  }

  const db = getDb();
  for (const row of data ?? []) {
    const remote = toLocal(row);
    const local = await db.table(table).get(getId(remote));
    if (!local || getUpdatedAt(remote) > getUpdatedAt(local as T)) {
      await put(remote);
    }
  }
}

export async function pullTasks(userId: string): Promise<void> {
  const db = getDb();
  await pullTable<Task>(
    'tasks',
    userId,
    remoteRowToTask,
    (r) => r.id,
    (r) => r.updated_at,
    (r) => db.tasks.put(r),
  );
}

export async function pullHabits(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habit_templates')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.warn('[sync] pull habit_templates failed', error);
    return;
  }
  const db = getDb();
  for (const row of data ?? []) {
    await db.habit_templates.put(remoteRowToHabit(row));
  }
}

export async function pullDays(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.from('days').select('*').eq('user_id', userId);
  if (error) {
    console.warn('[sync] pull days failed', error);
    return;
  }
  const db = getDb();
  for (const row of data ?? []) {
    await db.days.put(remoteRowToDay(row));
  }
}

export async function pullNotepad(userId: string): Promise<void> {
  const db = getDb();
  await pullTable<NotepadPage>(
    'notepad_pages',
    userId,
    remoteRowToNotepadPage,
    (r) => r.id,
    (r) => r.updated_at,
    (r) => db.notepad_pages.put(r),
  );
}

export async function pullLabels(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.warn('[sync] pull labels failed', error);
    return;
  }
  const db = getDb();
  for (const row of data ?? []) {
    await db.labels.put({
      id:         row.id,
      user_id:    row.user_id,
      name:       row.name,
      color:      row.color ?? '#6B8A5C',
      sort_order: row.sort_order ?? 0,
      created_at: new Date(row.created_at).getTime(),
      updated_at: new Date(row.updated_at).getTime(),
    });
  }
}

export async function pullTaskLabels(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('task_labels')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.warn('[sync] pull task_labels failed', error);
    return;
  }
  const db = getDb();
  for (const row of data ?? []) {
    await db.task_labels.put({
      id:         row.id,
      task_id:    row.task_id,
      label_id:   row.label_id,
      user_id:    row.user_id,
      created_at: new Date(row.created_at).getTime(),
    });
  }
}

export async function pullSettings(userId: string): Promise<void> {
  const db = getDb();
  const supabase = createClient();
  const { data } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle();
  if (!data) {
    // Insert blank settings row if missing
    const fresh: Settings = {
      user_id: userId,
      range_window_days: 5,
      deficit_seconds: 0,
      push_subscription: null,
      reduced_motion: false,
      password_pin_hash: null,
      updated_at: Date.now(),
    };
    await db.settings.put(fresh);
    await supabase.from('settings').insert({
      user_id: userId,
      range_window_days: 5,
      deficit_seconds: 0,
    });
    return;
  }
  await db.settings.put({
    user_id: data.user_id,
    range_window_days: data.range_window_days ?? 5,
    deficit_seconds: data.deficit_seconds ?? 0,
    push_subscription: data.push_subscription ?? null,
    reduced_motion: data.reduced_motion ?? false,
    password_pin_hash: (data.password_pin_hash as string | null) ?? null,
    updated_at: new Date(data.updated_at).getTime(),
  });
}

export async function pullPasswords(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('passwords')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.warn('[sync] pull passwords failed', error);
    return;
  }
  const db = getDb();
  for (const row of data ?? []) {
    const remote: Password = {
      id:         row.id,
      user_id:    row.user_id,
      name:       row.name ?? '',
      username:   row.username ?? '',
      password:   row.password ?? '',
      sites:      row.sites ?? '',
      note:       row.note ?? '',
      created_at: new Date(row.created_at).getTime(),
      updated_at: new Date(row.updated_at).getTime(),
    };
    const local = await db.passwords.get(remote.id);
    if (!local || remote.updated_at > local.updated_at) {
      await db.passwords.put(remote);
    }
  }
}

// ── Realtime ───────────────────────────────────────────────────────────────

let _channel: RealtimeChannel | null = null;

export function subscribeRealtime(userId: string): () => void {
  const supabase = createClient();
  if (_channel) supabase.removeChannel(_channel);

  _channel = supabase
    .channel(`sunflower-user-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      async (payload) => {
        const db = getDb();
        if (payload.eventType === 'DELETE') {
          await db.tasks.delete((payload.old as { id: string }).id);
        } else {
          const remote = remoteRowToTask(payload.new as Record<string, unknown>);
          const local = await db.tasks.get(remote.id);
          if (!local || remote.updated_at > local.updated_at) {
            await db.tasks.put(remote);
          }
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (payload.eventType !== 'DELETE' && payload.new) {
          const db = getDb();
          const row = payload.new as Record<string, unknown>;
          await db.settings.put({
            user_id: row.user_id as string,
            range_window_days: (row.range_window_days as number) ?? 5,
            deficit_seconds: (row.deficit_seconds as number) ?? 0,
            push_subscription: (row.push_subscription as PushSubscriptionJSON | null) ?? null,
            reduced_motion: (row.reduced_motion as boolean) ?? false,
            password_pin_hash: (row.password_pin_hash as string | null) ?? null,
            updated_at: new Date(row.updated_at as string).getTime(),
          });
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'passwords', filter: `user_id=eq.${userId}` },
      async (payload) => {
        const db = getDb();
        if (payload.eventType === 'DELETE') {
          await db.passwords.delete((payload.old as { id: string }).id);
        } else if (payload.new) {
          const row = payload.new as Record<string, unknown>;
          const remote: Password = {
            id:         row.id as string,
            user_id:    row.user_id as string,
            name:       (row.name as string) ?? '',
            username:   (row.username as string) ?? '',
            password:   (row.password as string) ?? '',
            sites:      (row.sites as string) ?? '',
            note:       (row.note as string) ?? '',
            created_at: new Date(row.created_at as string).getTime(),
            updated_at: new Date(row.updated_at as string).getTime(),
          };
          const local = await db.passwords.get(remote.id);
          if (!local || remote.updated_at > local.updated_at) {
            await db.passwords.put(remote);
          }
        }
      },
    )
    .subscribe();

  return () => {
    if (_channel) {
      supabase.removeChannel(_channel);
      _channel = null;
    }
  };
}

// ── Orchestrator ───────────────────────────────────────────────────────────

/** Pull every table for the user, in parallel. Safe to call any time
 *  (e.g. on visibility-change) to catch up if realtime missed events. */
export async function pullAll(userId: string): Promise<void> {
  await Promise.all([
    pullSettings(userId),
    pullHabits(userId),
    pullDays(userId),
    pullTasks(userId),
    pullNotepad(userId),
    pullLabels(userId),
    pullTaskLabels(userId),
    pullPasswords(userId),
  ]);
}

let _booted = false;

export async function bootSync(userId: string): Promise<() => void> {
  if (_booted) return () => {};
  _booted = true;

  await pullAll(userId);

  await flushQueue();
  const unsubscribe = subscribeRealtime(userId);

  // Periodic flush
  const interval = window.setInterval(() => {
    if (navigator.onLine) void flushQueue();
  }, 15_000);

  // Periodic re-pull (safety net if realtime websocket silently drops).
  const pullInterval = window.setInterval(() => {
    if (navigator.onLine) void pullAll(userId);
  }, 60_000);

  const onlineHandler = () => {
    void flushQueue();
    void pullAll(userId);
  };
  window.addEventListener('online', onlineHandler);

  return () => {
    unsubscribe();
    window.clearInterval(interval);
    window.clearInterval(pullInterval);
    window.removeEventListener('online', onlineHandler);
    _booted = false;
  };
}

// ── Row converters ─────────────────────────────────────────────────────────

function remoteRowToTask(row: Record<string, unknown>): Task {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    day_key:          row.day_key as string | null,
    template_id:      row.template_id as string | null,
    title:            row.title as string,
    description:      row.description as string | undefined,
    est_minutes:      (row.est_minutes as number) ?? 25,
    state:            (row.state as Task['state']) ?? 'open',
    started_at:       row.started_at ? new Date(row.started_at as string).getTime() : null,
    elapsed_ms:       (row.elapsed_ms as number) ?? 0,
    actual_ms:        row.actual_ms as number | null,
    completed_at:     row.completed_at ? new Date(row.completed_at as string).getTime() : null,
    completion_note:  row.completion_note as string | undefined,
    r3_slot:          row.r3_slot as 1 | 2 | 3 | null,
    sort_order:       (row.sort_order as number) ?? 0,
    skipped:          (row.skipped as boolean) ?? false,
    archived:         (row.archived as boolean) ?? false,
    workout_progress: (row.workout_progress as Task['workout_progress']) ?? null,
    subtasks:         (row.subtasks as Task['subtasks']) ?? null,
    start_time:       (row.start_time as string | null) ?? null,
    end_time:         (row.end_time as string | null) ?? null,
    habit_title:      (row.habit_title as string | null) ?? null,
    created_at:       new Date(row.created_at as string).getTime(),
    updated_at:       new Date(row.updated_at as string).getTime(),
  };
}

function remoteRowToHabit(row: Record<string, unknown>): HabitTemplate {
  return {
    id:               row.id as string,
    user_id:          row.user_id as string,
    title:            row.title as string,
    est_minutes:      (row.est_minutes as number) ?? 10,
    recurrence:       row.recurrence as HabitTemplate['recurrence'],
    recurrence_days:  (row.recurrence_days as number[] | null) ?? null,
    weight:           (row.weight as number) ?? 1,
    active:           (row.active as boolean) ?? true,
    sort_order:       (row.sort_order as number) ?? 0,
    kind:             (row.kind as HabitTemplate['kind']) ?? 'habit',
    workout_data:     (row.workout_data as HabitTemplate['workout_data']) ?? null,
    created_at:       new Date(row.created_at as string).getTime(),
  };
}

function remoteRowToDay(row: Record<string, unknown>): Day {
  return {
    user_id:         row.user_id as string,
    day_key:         row.day_key as string,
    notes:           (row.notes as string) ?? '',
    flower_state:    (row.flower_state as Day['flower_state']) ?? 'healthy',
    deficit_seconds: (row.deficit_seconds as number) ?? 0,
    logged_at:       row.logged_at ? new Date(row.logged_at as string).getTime() : null,
  };
}

function remoteRowToNotepadPage(row: Record<string, unknown>): NotepadPage {
  return {
    id:          row.id as string,
    user_id:     row.user_id as string,
    title:       row.title as string,
    body:        (row.body as string) ?? '',
    archived:    (row.archived as boolean) ?? false,
    archived_at: row.archived_at ? new Date(row.archived_at as string).getTime() : null,
    sort_order:  (row.sort_order as number) ?? 0,
    updated_at:  new Date(row.updated_at as string).getTime(),
  };
}
