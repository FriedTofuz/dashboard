'use client';

import { getDb, type Day } from './db';
import { enqueue } from './queue';

export async function setDayNotes(userId: string, dayKey: string, notes: string): Promise<void> {
  const db = getDb();
  const existing = await db.days.get([userId, dayKey]);
  const next: Day = {
    user_id: userId,
    day_key: dayKey,
    notes,
    flower_state: existing?.flower_state ?? 'healthy',
    deficit_seconds: existing?.deficit_seconds ?? 0,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, {
    user_id: userId,
    day_key: dayKey,
    notes,
    flower_state: next.flower_state,
    deficit_seconds: next.deficit_seconds,
  });
}

export async function setDayFlowerState(
  userId: string,
  dayKey: string,
  state: Day['flower_state'],
  deficitSeconds: number,
): Promise<void> {
  const db = getDb();
  const existing = await db.days.get([userId, dayKey]);
  const next: Day = {
    user_id: userId,
    day_key: dayKey,
    notes: existing?.notes ?? '',
    flower_state: state,
    deficit_seconds: deficitSeconds,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, {
    user_id: userId,
    day_key: dayKey,
    notes: next.notes,
    flower_state: state,
    deficit_seconds: deficitSeconds,
  });
}
