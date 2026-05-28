'use client';

import { getDb, type Day } from './db';
import { enqueue } from './queue';

/** Build the Supabase upsert payload for a Day row. Centralized so every
 *  caller serializes the same set of columns — including the optional ones
 *  (logged_at, away) which would otherwise drift between helpers. */
function dayToRemote(d: Day): Record<string, unknown> {
  return {
    user_id:         d.user_id,
    day_key:         d.day_key,
    notes:           d.notes,
    flower_state:    d.flower_state,
    deficit_seconds: d.deficit_seconds,
    logged_at:       d.logged_at != null ? new Date(d.logged_at).toISOString() : null,
    away:            d.away ?? false,
  };
}

export async function setDayNotes(userId: string, dayKey: string, notes: string): Promise<void> {
  const db = getDb();
  const existing = await db.days.get([userId, dayKey]);
  const next: Day = {
    user_id: userId,
    day_key: dayKey,
    notes,
    flower_state: existing?.flower_state ?? 'healthy',
    deficit_seconds: existing?.deficit_seconds ?? 0,
    logged_at: existing?.logged_at ?? null,
    away: existing?.away ?? false,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, dayToRemote(next));
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
    logged_at: existing?.logged_at ?? null,
    away: existing?.away ?? false,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, dayToRemote(next));
}

/** Toggle the "logged" flag for a day. Only logged days count toward
 *  cumulative stats / streak; unlogged days render blank. */
export async function toggleDayLogged(userId: string, dayKey: string): Promise<boolean> {
  const db = getDb();
  const existing = await db.days.get([userId, dayKey]);
  const wasLogged = existing?.logged_at != null;
  const next: Day = {
    user_id: userId,
    day_key: dayKey,
    notes: existing?.notes ?? '',
    flower_state: existing?.flower_state ?? 'healthy',
    deficit_seconds: existing?.deficit_seconds ?? 0,
    logged_at: wasLogged ? null : Date.now(),
    away: existing?.away ?? false,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, dayToRemote(next));
  return !wasLogged;
}

/** Set the "rest day" flag for a day. When marking a day as away, it's
 *  also implicitly logged so the streak strip can render it without the
 *  user having to also click Log Day. Unmarking does NOT unlog — the user
 *  may have logged the day explicitly. */
export async function setDayAway(
  userId: string,
  dayKey: string,
  away: boolean,
): Promise<void> {
  const db = getDb();
  const existing = await db.days.get([userId, dayKey]);
  const next: Day = {
    user_id: userId,
    day_key: dayKey,
    notes: existing?.notes ?? '',
    flower_state: existing?.flower_state ?? 'healthy',
    deficit_seconds: existing?.deficit_seconds ?? 0,
    logged_at:
      away && existing?.logged_at == null
        ? Date.now()
        : existing?.logged_at ?? null,
    away,
  };
  await db.days.put(next);
  enqueue('upsert', 'days', `${userId}_${dayKey}`, dayToRemote(next));
}
