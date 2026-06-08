'use client';

import { getDb, type Password } from './db';
import { enqueue } from './queue';
import { clamp, LIMITS } from '@/lib/validation/limits';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewPasswordInput = Omit<
  Password,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/** Apply v2.5 length caps to every text field before write — matches the
 *  CHECK constraints in migration 0009 so writes don't silently fail in
 *  the cloud sync layer. */
function sanitizePassword<T extends Partial<Password>>(p: T): T {
  const out = { ...p };
  if (out.name !== undefined)     out.name     = clamp(out.name, LIMITS.password_name);
  if (out.username !== undefined) out.username = clamp(out.username, LIMITS.password_username);
  if (out.password !== undefined) out.password = clamp(out.password, LIMITS.password_password);
  if (out.sites !== undefined)    out.sites    = clamp(out.sites, LIMITS.password_sites);
  if (out.note !== undefined)     out.note     = clamp(out.note, LIMITS.password_note);
  return out;
}

export async function createPassword(
  data: NewPasswordInput,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const row: Password = {
    ...sanitizePassword(data),
    id,
    user_id: userId,
    created_at: ts,
    updated_at: ts,
  };
  await getDb().passwords.add(row);
  enqueue('upsert', 'passwords', id, passwordToRemote(row));
  return id;
}

export async function updatePassword(
  id: string,
  changes: Partial<Password>,
): Promise<void> {
  const ts = now();
  const safe = sanitizePassword(changes);
  await getDb().passwords.update(id, { ...safe, updated_at: ts });
  const updated = await getDb().passwords.get(id);
  if (updated) enqueue('upsert', 'passwords', id, passwordToRemote(updated));
}

export async function deletePassword(id: string): Promise<void> {
  await getDb().passwords.delete(id);
  enqueue('delete', 'passwords', id, null);
}

function passwordToRemote(p: Password): Record<string, unknown> {
  return {
    id:         p.id,
    user_id:    p.user_id,
    name:       p.name,
    username:   p.username,
    password:   p.password,
    sites:      p.sites,
    note:       p.note,
    created_at: new Date(p.created_at).toISOString(),
    updated_at: new Date(p.updated_at).toISOString(),
  };
}

// ── PIN hashing ──────────────────────────────────────────────────────────

const DEFAULT_PIN = '24850';

/** SHA-256 hex digest of a PIN. Used both to seed the default and to verify
 *  user input against the stored hash. */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns the hash of the default PIN. Memoized — same hash every call. */
let _defaultHash: string | null = null;
export async function defaultPinHash(): Promise<string> {
  if (_defaultHash) return _defaultHash;
  _defaultHash = await hashPin(DEFAULT_PIN);
  return _defaultHash;
}

/** Seed the user's PIN to the default if they haven't set one yet. Idempotent. */
export async function ensureDefaultPin(userId: string): Promise<void> {
  const db = getDb();
  const settings = await db.settings.get(userId);
  if (!settings) return; // no settings row yet; bootSync will create one and we'll re-run
  if (settings.password_pin_hash) return;

  const hash = await defaultPinHash();
  const ts = now();
  await db.settings.update(userId, {
    password_pin_hash: hash,
    updated_at: ts,
  });
  enqueue('upsert', 'settings', userId, {
    user_id: userId,
    password_pin_hash: hash,
    updated_at: new Date(ts).toISOString(),
  });
}

/** Update the user's PIN to a new value.
 *  If card encryption is enabled AND CMK is currently in session memory,
 *  also re-wrap the CMK under the new PIN so the next unlock with the new
 *  PIN still recovers the encryption key. (The CMK itself is unchanged —
 *  no card rows need re-encryption.) */
export async function setPin(userId: string, newPin: string): Promise<void> {
  const db = getDb();
  const ts = now();
  const hash = await hashPin(newPin);
  const settings = await db.settings.get(userId);
  const patch: Record<string, unknown> = { password_pin_hash: hash };

  if (settings?.card_encryption_enabled) {
    const { getSessionCmk } = await import('@/lib/crypto/session');
    const { wrapCmk } = await import('@/lib/crypto/cards');
    const cmk = getSessionCmk();
    if (cmk) {
      patch.card_pin_keybox = await wrapCmk(cmk, newPin);
    }
    // Note: if CMK is not in session, we still update the SHA hash. The
    // pin-keybox stays bound to the OLD PIN, which means the user is
    // locked out of card encryption with this new PIN until they recover
    // via the recovery code. The LogbookModal Change-PIN flow always
    // requires an unlocked session, so this branch is reachable only via
    // a direct API call.
  }

  await db.settings.update(userId, { ...patch, updated_at: ts });
  enqueue('upsert', 'settings', userId, {
    user_id: userId,
    ...patch,
    updated_at: new Date(ts).toISOString(),
  });
}
