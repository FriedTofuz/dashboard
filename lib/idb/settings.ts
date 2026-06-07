'use client';

import { getDb } from './db';
import { enqueue } from './queue';

/** Add or subtract a delta from the user's running deficit_seconds counter
 *  and queue the change for sync. Floor at 0 — the deficit can't go below 0
 *  because the existing UI assumes deficit is always non-negative ("0m" means
 *  on-target, never ahead). */
export async function adjustDeficit(
  userId: string,
  deltaSeconds: number,
): Promise<number> {
  const db = getDb();
  const settings = await db.settings.get(userId);
  if (!settings) return 0;
  const ts = Date.now();
  const newDeficit = Math.max(0, settings.deficit_seconds + deltaSeconds);
  await db.settings.update(userId, {
    deficit_seconds: newDeficit,
    updated_at: ts,
  });
  enqueue('upsert', 'settings', userId, {
    user_id: userId,
    deficit_seconds: newDeficit,
    updated_at: new Date(ts).toISOString(),
  });
  return newDeficit;
}
