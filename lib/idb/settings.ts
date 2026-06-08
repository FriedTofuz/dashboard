'use client';

import { getDb } from './db';
import { enqueue } from './queue';
import {
  generateCmk,
  generateRecoveryCode,
  recoveryCheckHex,
  wrapCmk,
  unwrapCmk,
  normaliseRecoveryCode,
} from '@/lib/crypto/cards';
import { setSessionCmk } from '@/lib/crypto/session';
import { migrateExistingCardsToEncrypted } from './cards';

function now() { return Date.now(); }

/** Generic settings patcher: write a partial change to the local row +
 *  queue a Supabase upsert. Centralised so we don't litter individual
 *  helpers with the same boilerplate. */
async function patchSettings(
  userId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  const ts = now();
  const db = getDb();
  await db.settings.update(userId, { ...changes, updated_at: ts });
  enqueue('upsert', 'settings', userId, {
    user_id: userId,
    ...changes,
    updated_at: new Date(ts).toISOString(),
  });
}

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
  const newDeficit = Math.max(0, settings.deficit_seconds + deltaSeconds);
  await patchSettings(userId, { deficit_seconds: newDeficit });
  return newDeficit;
}

/** Persist the user's chosen max-width preset.
 *  null = use default (1500), 0 = no cap ("Full"), or 1200/1500/1700/1920. */
export async function setUiMaxWidth(
  userId: string,
  value: number | null,
): Promise<void> {
  await patchSettings(userId, { ui_max_width_px: value });
}

// ── Card-encryption opt-in flow ──────────────────────────────────────────

export interface EnableEncryptionResult {
  /** One-time recovery code to show the user. Discarded after acknowledgement. */
  recoveryCode: string;
  /** Count of pre-existing card rows that were migrated to ciphertext. */
  migratedCount: number;
}

/** First-time encryption opt-in:
 *  1. Generate a fresh CMK + a fresh recovery code.
 *  2. Wrap CMK with PIN-derived KEK and recovery-code-derived KEK.
 *  3. Persist the boxes (+ HMAC of recovery code for fast validation).
 *  4. Stash CMK in session memory.
 *  5. Re-encrypt every existing plaintext card row for this user.
 *
 *  Returns the recovery code so the modal can display it once. */
export async function enableCardEncryption(
  userId: string,
  pin: string,
): Promise<EnableEncryptionResult> {
  const cmk = generateCmk();
  const recoveryCode = generateRecoveryCode();
  const [pinKeybox, recKeybox, recCheck] = await Promise.all([
    wrapCmk(cmk, pin),
    wrapCmk(cmk, normaliseRecoveryCode(recoveryCode)),
    recoveryCheckHex(recoveryCode),
  ]);

  setSessionCmk(cmk);
  await patchSettings(userId, {
    card_encryption_enabled: true,
    card_pin_keybox: pinKeybox,
    card_recovery_keybox: recKeybox,
    card_recovery_check: recCheck,
  });

  const migratedCount = await migrateExistingCardsToEncrypted(userId);
  return { recoveryCode, migratedCount };
}

/** Use the PIN to unwrap the CMK from its PIN-keybox into session memory.
 *  Called by LogbookModal on successful PIN entry when encryption is on. */
export async function unlockCardEncryptionWithPin(
  userId: string,
  pin: string,
): Promise<boolean> {
  const s = await getDb().settings.get(userId);
  if (!s?.card_encryption_enabled || !s.card_pin_keybox) return false;
  try {
    const cmk = await unwrapCmk(s.card_pin_keybox, pin);
    setSessionCmk(cmk);
    return true;
  } catch {
    return false;
  }
}

/** Use the recovery code to unwrap the CMK and re-wrap it under a new PIN.
 *  Returns true on success. Updates `card_pin_keybox` AND `password_pin_hash`
 *  so the new PIN unlocks both the Logbook gate and the encryption. */
export async function recoverCardEncryptionWithRecoveryCode(
  userId: string,
  recoveryCode: string,
  newPin: string,
): Promise<boolean> {
  const normalised = normaliseRecoveryCode(recoveryCode);
  const s = await getDb().settings.get(userId);
  if (!s?.card_encryption_enabled || !s.card_recovery_keybox || !s.card_recovery_check) {
    return false;
  }
  // Fast HMAC check before the slow AES decryption.
  const check = await recoveryCheckHex(recoveryCode);
  if (check !== s.card_recovery_check) return false;
  try {
    const cmk = await unwrapCmk(s.card_recovery_keybox, normalised);
    setSessionCmk(cmk);
    // Re-wrap CMK under the new PIN so future PIN unlocks work, AND
    // rotate the Logbook SHA-256 gate to the new PIN too.
    const { hashPin } = await import('./passwords');
    const [newPinKeybox, newHash] = await Promise.all([
      wrapCmk(cmk, newPin),
      hashPin(newPin),
    ]);
    await patchSettings(userId, {
      card_pin_keybox: newPinKeybox,
      password_pin_hash: newHash,
    });
    return true;
  } catch {
    return false;
  }
}
