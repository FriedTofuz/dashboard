'use client';

import { getDb, type NotepadPage } from './db';
import { enqueue } from './queue';
import { setDayNotes } from './days';
import { addDays } from '@/lib/time/dayKey';

function newId() { return crypto.randomUUID(); }

function pageToRemote(p: NotepadPage): Record<string, unknown> {
  return {
    id:           p.id,
    user_id:      p.user_id,
    title:        p.title,
    body:         p.body,
    archived:     p.archived,
    archived_at:  p.archived_at ? new Date(p.archived_at).toISOString() : null,
    sort_order:   p.sort_order,
    updated_at:   new Date(p.updated_at).toISOString(),
  };
}

/** Bundle one or more days of scratch notes into a single archived notepad
 *  page. Then clear each day's notes. The resulting page is searchable in
 *  the archive view. Returns the new page id, or null if the range was
 *  empty (no notes worth archiving).
 *
 *  Range is inclusive on both ends and order-agnostic. */
export async function archiveNotepadRange(
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<string | null> {
  // Normalize order
  const [startKey, endKey] = fromKey <= toKey ? [fromKey, toKey] : [toKey, fromKey];

  const db = getDb();
  const keys: string[] = [];
  let cursor = startKey;
  // Safety bound — 366 days max to avoid runaway loops
  for (let i = 0; i < 366 && cursor <= endKey; i++) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const rows = await Promise.all(
    keys.map((k) => db.days.get([userId, k])),
  );

  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const notes = (row.notes ?? '').trim();
    if (!notes) continue;
    parts.push(`— ${keys[i]} —\n${notes}`);
  }

  if (parts.length === 0) return null;

  const ts = Date.now();
  const title = startKey === endKey
    ? `notes · ${startKey}`
    : `notes · ${startKey} → ${endKey}`;

  const page: NotepadPage = {
    id: newId(),
    user_id: userId,
    title,
    body: parts.join('\n\n'),
    archived: true,
    archived_at: ts,
    sort_order: ts,
    updated_at: ts,
  };

  await db.notepad_pages.put(page);
  enqueue('upsert', 'notepad_pages', page.id, pageToRemote(page));

  // Clear the scratch paper for each day in the range
  await Promise.all(keys.map((k) => setDayNotes(userId, k, '')));

  return page.id;
}
