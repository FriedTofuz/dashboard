'use client';

import { getDb, type HabitTemplate, type Task } from './db';
import { enqueue } from './queue';
import { isHabitScheduledFor } from '@/lib/time/dayKey';

function newId() { return crypto.randomUUID(); }
function now() { return Date.now(); }

export async function createHabit(
  data: Omit<HabitTemplate, 'id' | 'user_id' | 'created_at'>,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const habit: HabitTemplate = { ...data, id, user_id: userId, created_at: ts };
  await getDb().habit_templates.add(habit);
  enqueue('upsert', 'habit_templates', id, habitToRemote(habit));
  return id;
}

export async function updateHabit(id: string, changes: Partial<HabitTemplate>): Promise<void> {
  await getDb().habit_templates.update(id, changes);
  const updated = await getDb().habit_templates.get(id);
  if (updated) enqueue('upsert', 'habit_templates', id, habitToRemote(updated));
}

export async function deleteHabit(id: string): Promise<void> {
  await getDb().habit_templates.delete(id);
  enqueue('delete', 'habit_templates', id, null);
}

/** Materialize habit instances for `dayKey` — idempotent. */
export async function ensureHabitInstances(dayKey: string, userId: string): Promise<void> {
  const db = getDb();

  const templates = await db.habit_templates
    .where('user_id')
    .equals(userId)
    .filter((h) => h.active && isHabitScheduledFor(h.recurrence, h.recurrence_days, dayKey))
    .toArray();

  for (const tmpl of templates) {
    const existing = await db.tasks
      .where('[user_id+template_id+day_key]')
      .equals([userId, tmpl.id, dayKey])
      .first();
    if (existing) continue;

    const ts = now();

    // For workout templates, build a description from today's exercises so it
    // shows up in the task row's secondary line; structured rendering happens
    // via the workout panel.
    let description: string | undefined;
    if (tmpl.kind === 'workout' && tmpl.workout_data) {
      const dow = new Date(`${dayKey}T00:00:00`).getDay();
      const plan = tmpl.workout_data[dow];
      if (plan && plan.exercises.length > 0) {
        const lines: string[] = [];
        if (plan.title) lines.push(plan.title);
        for (const ex of plan.exercises) {
          const w = ex.weight ? ` @ ${ex.weight}` : '';
          lines.push(`${ex.sets}×${ex.reps} ${ex.name}${w}`);
        }
        description = lines.join('\n');
      }
    }

    const task: Task = {
      id: newId(),
      user_id: userId,
      day_key: dayKey,
      template_id: tmpl.id,
      title: tmpl.title,
      description,
      est_minutes: tmpl.est_minutes,
      state: 'open',
      started_at: null,
      elapsed_ms: 0,
      actual_ms: null,
      completed_at: null,
      completion_note: undefined,
      r3_slot: null,
      sort_order: tmpl.sort_order,
      skipped: false,
      archived: false,
      workout_progress: tmpl.kind === 'workout' ? {} : null,
      created_at: ts,
      updated_at: ts,
    };
    await db.tasks.add(task);
    enqueue('upsert', 'tasks', task.id, taskToRemote(task));
  }
}

function habitToRemote(h: HabitTemplate): Record<string, unknown> {
  return {
    id:               h.id,
    user_id:          h.user_id,
    title:            h.title,
    est_minutes:      h.est_minutes,
    recurrence:       h.recurrence,
    recurrence_days:  h.recurrence_days,
    weight:           h.weight,
    active:           h.active,
    sort_order:       h.sort_order,
    kind:             h.kind ?? 'habit',
    workout_data:     h.workout_data ?? null,
    created_at:       new Date(h.created_at).toISOString(),
  };
}

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
    created_at:       new Date(t.created_at).toISOString(),
    updated_at:       new Date(t.updated_at).toISOString(),
  };
}
