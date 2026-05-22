'use client';

import { getDb, type Task } from './db';
import { enqueue } from './queue';
import { applyTaskToDeficit, reverseTaskFromDeficit } from '@/lib/compute/deficit';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

// ── Create / update ───────────────────────────────────────────────────────

export async function createTask(
  data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const task: Task = { ...data, id, user_id: userId, created_at: ts, updated_at: ts };
  await getDb().tasks.add(task);
  enqueue('upsert', 'tasks', id, taskToRemote(task));
  return id;
}

export async function updateTask(id: string, changes: Partial<Task>): Promise<void> {
  const ts = now();
  await getDb().tasks.update(id, { ...changes, updated_at: ts });
  const updated = await getDb().tasks.get(id);
  if (updated) enqueue('upsert', 'tasks', id, taskToRemote(updated));
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  // Clean up any label assignments locally; Supabase cascade handles the
  // remote side via the FK constraint.
  const links = await db.task_labels.where('task_id').equals(id).toArray();
  for (const link of links) {
    await db.task_labels.delete(link.id);
  }
  await db.tasks.delete(id);
  enqueue('delete', 'tasks', id, null);
}

// ── Status transitions ────────────────────────────────────────────────────

/** Start the timer on a task. Pauses any currently-running task first. */
export async function startTimer(taskId: string): Promise<void> {
  const db = getDb();
  const ts = now();

  await db.transaction('rw', db.tasks, async () => {
    const running = await db.tasks.where('state').equals('running').first();
    if (running && running.id !== taskId) {
      const elapsed = running.elapsed_ms + (running.started_at ? ts - running.started_at : 0);
      await db.tasks.update(running.id, {
        state: 'paused',
        started_at: null,
        elapsed_ms: elapsed,
        updated_at: ts,
      });
      enqueue('upsert', 'tasks', running.id, taskToRemote({
        ...running, state: 'paused', started_at: null, elapsed_ms: elapsed, updated_at: ts,
      }));
    }
    await db.tasks.update(taskId, {
      state: 'running',
      started_at: ts,
      updated_at: ts,
    });
  });
  const updated = await db.tasks.get(taskId);
  if (updated) enqueue('upsert', 'tasks', taskId, taskToRemote(updated));
}

export async function pauseTimer(taskId: string): Promise<void> {
  const ts = now();
  const task = await getDb().tasks.get(taskId);
  if (!task || task.state !== 'running') return;

  const elapsed = task.elapsed_ms + (task.started_at ? ts - task.started_at : 0);
  await updateTask(taskId, { state: 'paused', started_at: null, elapsed_ms: elapsed });
}

/**
 * Heartbeat: fold the running window into elapsed_ms and reset started_at to now.
 * Called every 30s and on visibility/unload so a crash loses ≤ 30s.
 */
export async function heartbeatTimer(taskId: string): Promise<void> {
  const ts = now();
  const task = await getDb().tasks.get(taskId);
  if (!task || task.state !== 'running' || !task.started_at) return;
  const elapsed = task.elapsed_ms + (ts - task.started_at);
  await updateTask(taskId, { elapsed_ms: elapsed, started_at: ts });
}

export async function completeTask(
  taskId: string,
  note?: string,
  overrideActualMs?: number,
): Promise<void> {
  const ts = now();
  const db = getDb();
  const task = await db.tasks.get(taskId);
  if (!task) return;

  const trackedMs = task.elapsed_ms + (task.started_at ? ts - task.started_at : 0);
  const actualMs =
    overrideActualMs != null && Number.isFinite(overrideActualMs) && overrideActualMs >= 0
      ? overrideActualMs
      : trackedMs;

  await updateTask(taskId, {
    state: 'done',
    started_at: null,
    elapsed_ms: actualMs,
    actual_ms: actualMs,
    completed_at: ts,
    completion_note: note,
  });

  // Update cumulative deficit. Habits do NOT count — recurring routines
  // shouldn't move the deficit needle.
  if (task.template_id == null) {
    const settings = await db.settings.toCollection().first();
    if (settings) {
      const { newDeficit } = applyTaskToDeficit(
        task.est_minutes,
        actualMs,
        settings.deficit_seconds,
      );
      await db.settings.update(settings.user_id, {
        deficit_seconds: newDeficit,
        updated_at: ts,
      });
      enqueue('upsert', 'settings', settings.user_id, {
        user_id: settings.user_id,
        deficit_seconds: newDeficit,
        updated_at: new Date(ts).toISOString(),
      });
    }
  }
}

export async function uncompleteTask(taskId: string): Promise<void> {
  const db = getDb();
  const task = await db.tasks.get(taskId);
  if (!task || task.state !== 'done') return;

  await updateTask(taskId, {
    state: 'open',
    actual_ms: null,
    completed_at: null,
    completion_note: undefined,
    elapsed_ms: 0,
  });

  // Reverse the deficit change. Mirror applyTaskToDeficit exactly so that
  // check / uncheck / recheck balances to zero (modulo the floor-at-0 clamp).
  // Habits never moved the deficit on complete, so skip them here too.
  if (task.actual_ms != null && task.template_id == null) {
    const settings = await db.settings.toCollection().first();
    if (settings) {
      const { newDeficit } = reverseTaskFromDeficit(
        task.est_minutes,
        task.actual_ms,
        settings.deficit_seconds,
      );
      await db.settings.update(settings.user_id, {
        deficit_seconds: newDeficit,
        updated_at: Date.now(),
      });
      enqueue('upsert', 'settings', settings.user_id, {
        user_id: settings.user_id,
        deficit_seconds: newDeficit,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

export async function setR3Slot(
  taskId: string,
  slot: 1 | 2 | 3 | null,
  dayKey: string,
): Promise<void> {
  const db = getDb();
  const ts = now();
  const task = await db.tasks.get(taskId);
  if (!task) return;

  await db.transaction('rw', db.tasks, async () => {
    if (slot !== null) {
      // Evict the existing slot-holder on the TARGET day only.
      //
      // The previous query used `.between(['', dayKey], ['￿', dayKey])` on the
      // [user_id+day_key] compound index, but Dexie compares compound tuples
      // lexicographically — that range matches records across all users AND
      // all days, so `.first()` could return (and evict) an R3 task from a
      // completely different day. Use `.equals([userId, dayKey])` to scope
      // properly.
      const occupant = await db.tasks
        .where('[user_id+day_key]')
        .equals([task.user_id, dayKey])
        .filter((t) => t.r3_slot === slot && t.id !== taskId)
        .first();
      if (occupant) {
        await db.tasks.update(occupant.id, { r3_slot: null, updated_at: ts });
        enqueue('upsert', 'tasks', occupant.id, taskToRemote({ ...occupant, r3_slot: null, updated_at: ts }));
      }
      // Also move the task to the target day. Without this, dragging a task
      // from yesterday into today's R3 leaves it on yesterday (with r3_slot
      // set) — confusing, since it appears on the OLD day's R3 row.
      const updates: Partial<Task> = { r3_slot: slot, updated_at: ts };
      if (task.day_key !== dayKey) updates.day_key = dayKey;
      await db.tasks.update(taskId, updates);
    } else {
      // Demoting out of R3 — preserve day_key.
      await db.tasks.update(taskId, { r3_slot: null, updated_at: ts });
    }
  });
  const updated = await db.tasks.get(taskId);
  if (updated) enqueue('upsert', 'tasks', taskId, taskToRemote(updated));
}

/** Reorder: place taskId between two siblings (fractional indexing). */
export async function reorderTask(
  taskId: string,
  beforeSortOrder: number | null,
  afterSortOrder: number | null,
): Promise<void> {
  let newOrder: number;
  if (beforeSortOrder == null && afterSortOrder == null) newOrder = 0;
  else if (beforeSortOrder == null) newOrder = (afterSortOrder as number) - 1;
  else if (afterSortOrder == null) newOrder = beforeSortOrder + 1;
  else newOrder = (beforeSortOrder + afterSortOrder) / 2;

  await updateTask(taskId, { sort_order: newOrder });
}

/** Move a task to another day. */
export async function moveTaskToDay(taskId: string, dayKey: string): Promise<void> {
  await updateTask(taskId, { day_key: dayKey, r3_slot: null });
}

/** Duplicate a task into the same day (or a target day). The clone is fresh:
 *  state=open, no timer, no completion data, no R3 slot. Sort order is bumped
 *  so the clone shows up below the original. */
export async function duplicateTask(taskId: string, targetDayKey?: string): Promise<string | null> {
  const original = await getDb().tasks.get(taskId);
  if (!original) return null;
  return createTask(
    {
      day_key: targetDayKey ?? original.day_key,
      template_id: null, // habit instances duplicate as standalone one-offs
      title: original.title,
      description: original.description,
      est_minutes: original.est_minutes,
      state: 'open',
      started_at: null,
      elapsed_ms: 0,
      actual_ms: null,
      completed_at: null,
      completion_note: undefined,
      r3_slot: null,
      sort_order: original.sort_order + 0.5,
      skipped: false,
      archived: false,
    },
    original.user_id,
  );
}

/** Toggle skip on a habit instance. */
export async function skipTask(taskId: string, skipped = true): Promise<void> {
  await updateTask(taskId, { skipped });
}

// ── Serialization ─────────────────────────────────────────────────────────

function taskToRemote(t: Task): Record<string, unknown> {
  return {
    id:               t.id,
    user_id:          t.user_id,
    day_key:          t.day_key,
    template_id:      t.template_id,
    title:            t.title,
    description:      t.description ?? null,
    est_minutes:      t.est_minutes,
    state:            t.state,
    started_at:       t.started_at ? new Date(t.started_at).toISOString() : null,
    elapsed_ms:       t.elapsed_ms,
    actual_ms:        t.actual_ms,
    completed_at:     t.completed_at ? new Date(t.completed_at).toISOString() : null,
    completion_note:  t.completion_note ?? null,
    r3_slot:          t.r3_slot,
    sort_order:       t.sort_order,
    skipped:          t.skipped,
    archived:         t.archived,
    workout_progress: t.workout_progress ?? null,
    subtasks:         t.subtasks ?? null,
    start_time:       t.start_time ?? null,
    end_time:         t.end_time ?? null,
    habit_title:      t.habit_title ?? null,
    created_at:       new Date(t.created_at).toISOString(),
    updated_at:       new Date(t.updated_at).toISOString(),
  };
}
