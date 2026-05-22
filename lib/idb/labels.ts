'use client';

import { getDb, type Label, type TaskLabel } from './db';
import { enqueue } from './queue';

function newId() { return crypto.randomUUID(); }
function now() { return Date.now(); }

/** Default palette — pulled from app design tokens so label chips fit in. */
export const LABEL_COLOR_PRESETS = [
  '#6B8A5C', // sage
  '#B85C3E', // terracotta
  '#C98A2E', // ochre
  '#4C6B3F', // sage-deep
  '#8E3F26', // terra-deep
  '#9A6618', // ochre-deep
  '#5B6F8A', // dusty blue
  '#7A5C8A', // dusty plum
  '#6E6457', // ink-faint
];

// ── CRUD ────────────────────────────────────────────────────────────────

export async function createLabel(
  data: Omit<Label, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const label: Label = { ...data, id, user_id: userId, created_at: ts, updated_at: ts };
  await getDb().labels.add(label);
  enqueue('upsert', 'labels', id, labelToRemote(label));
  return id;
}

export async function updateLabel(id: string, changes: Partial<Label>): Promise<void> {
  const ts = now();
  await getDb().labels.update(id, { ...changes, updated_at: ts });
  const updated = await getDb().labels.get(id);
  if (updated) enqueue('upsert', 'labels', id, labelToRemote(updated));
}

export async function deleteLabel(id: string): Promise<void> {
  const db = getDb();
  // Remove all task_labels rows referencing this label first so any UI
  // that's already rendered drops the chip.
  const links = await db.task_labels.where('label_id').equals(id).toArray();
  for (const link of links) {
    await db.task_labels.delete(link.id);
    enqueue('delete', 'task_labels', link.id, null);
  }
  await db.labels.delete(id);
  enqueue('delete', 'labels', id, null);
}

// ── Task ↔ Label join ──────────────────────────────────────────────────

export async function getLabelsForTask(taskId: string): Promise<string[]> {
  const links = await getDb()
    .task_labels.where('task_id')
    .equals(taskId)
    .toArray();
  return links.map((l) => l.label_id);
}

/** Add a single label to multiple tasks (idempotent — skips already-tagged
 *  tasks). Used by the search modal's bulk-assign flow. */
export async function assignLabelToTasks(
  taskIds: string[],
  labelId: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const ts = now();
  for (const taskId of taskIds) {
    const linkId = `${taskId}|${labelId}`;
    const existing = await db.task_labels.get(linkId);
    if (existing) continue;
    const link: TaskLabel = {
      id: linkId,
      task_id: taskId,
      label_id: labelId,
      user_id: userId,
      created_at: ts,
    };
    await db.task_labels.put(link);
    enqueue('upsert', 'task_labels', link.id, taskLabelToRemote(link));
  }
}

export async function setTaskLabels(
  taskId: string,
  labelIds: string[],
  userId: string,
): Promise<void> {
  const db = getDb();
  const existing = await db.task_labels.where('task_id').equals(taskId).toArray();
  const existingIds = new Set(existing.map((l) => l.label_id));
  const targetIds = new Set(labelIds);

  // Remove links no longer present.
  for (const link of existing) {
    if (!targetIds.has(link.label_id)) {
      await db.task_labels.delete(link.id);
      enqueue('delete', 'task_labels', link.id, null);
    }
  }
  // Add new links.
  const ts = now();
  for (const labelId of labelIds) {
    if (existingIds.has(labelId)) continue;
    const link: TaskLabel = {
      id: `${taskId}|${labelId}`,
      task_id: taskId,
      label_id: labelId,
      user_id: userId,
      created_at: ts,
    };
    await db.task_labels.put(link);
    enqueue('upsert', 'task_labels', link.id, taskLabelToRemote(link));
  }
}

// ── Serialization ──────────────────────────────────────────────────────

function labelToRemote(l: Label): Record<string, unknown> {
  return {
    id:         l.id,
    user_id:    l.user_id,
    name:       l.name,
    color:      l.color,
    sort_order: l.sort_order,
    created_at: new Date(l.created_at).toISOString(),
    updated_at: new Date(l.updated_at).toISOString(),
  };
}

function taskLabelToRemote(l: TaskLabel): Record<string, unknown> {
  return {
    id:         l.id,
    task_id:    l.task_id,
    label_id:   l.label_id,
    user_id:    l.user_id,
    created_at: new Date(l.created_at).toISOString(),
  };
}
