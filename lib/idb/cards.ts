'use client';

import { getDb, type Card } from './db';
import { enqueue } from './queue';
import { clamp, LIMITS } from '@/lib/validation/limits';
import { encryptField, decryptField } from '@/lib/crypto/cards';
import { getSessionCmk } from '@/lib/crypto/session';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewCardInput = Omit<
  Card,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/** v2.5 length caps on every text field. */
function sanitizeCard<T extends Partial<Card>>(c: T): T {
  const out = { ...c };
  if (out.name              !== undefined) out.name              = clamp(out.name, LIMITS.card_name);
  if (out.cardholder        !== undefined) out.cardholder        = clamp(out.cardholder, LIMITS.card_cardholder);
  if (out.number            !== undefined) out.number            = clamp(out.number, LIMITS.card_number);
  if (out.security_code     !== undefined) out.security_code     = clamp(out.security_code, LIMITS.card_security_code);
  if (out.issuer            !== undefined) out.issuer            = clamp(out.issuer, LIMITS.card_issuer);
  if (out.expires           !== undefined) out.expires           = clamp(out.expires, LIMITS.card_expires);
  if (out.notes             !== undefined) out.notes             = clamp(out.notes, LIMITS.card_notes);
  if (out.number_enc        != null)       out.number_enc        = clamp(out.number_enc, LIMITS.card_enc_blob);
  if (out.security_code_enc != null)       out.security_code_enc = clamp(out.security_code_enc, LIMITS.card_enc_blob);
  return out;
}

/** When the user has opted in to encryption AND the Logbook is unlocked
 *  (CMK in session), turn the plaintext `number` and `security_code` on a
 *  card row into encrypted blobs in `*_enc`. The plaintext fields are
 *  emptied and `is_encrypted` is set true so the server-side
 *  cards_enc_consistency_check passes.
 *
 *  When CMK is absent or `encryptionEnabled` is false, the card is left
 *  as-is (plaintext path). */
async function maybeEncryptCard<T extends Partial<Card>>(
  c: T,
  encryptionEnabled: boolean,
): Promise<T> {
  if (!encryptionEnabled) return c;
  const cmk = getSessionCmk();
  if (!cmk) return c;

  const out: T = { ...c };
  if (typeof out.number === 'string' && out.number.length > 0) {
    out.number_enc = await encryptField(out.number, cmk);
    out.number = '';
  } else if (out.number === '') {
    // Caller is explicitly clearing the field — also clear the cipher.
    out.number_enc = null;
  }
  if (typeof out.security_code === 'string' && out.security_code.length > 0) {
    out.security_code_enc = await encryptField(out.security_code, cmk);
    out.security_code = '';
  } else if (out.security_code === '') {
    out.security_code_enc = null;
  }
  // Only flag the row encrypted if we ended up writing at least one
  // ciphertext — a card whose number and CVV are both empty stays unencrypted.
  if (out.number_enc != null || out.security_code_enc != null) {
    out.is_encrypted = true;
  }
  return out;
}

/** Read-side helper: returns plaintext `number` / `security_code` for a
 *  card row, decrypting on the fly if the row is encrypted and the
 *  Logbook is unlocked. When the Logbook is locked, returns a placeholder. */
export async function readCardSecrets(c: Card): Promise<{ number: string; security_code: string }> {
  if (!c.is_encrypted) return { number: c.number, security_code: c.security_code };
  const cmk = getSessionCmk();
  if (!cmk) return { number: '••••', security_code: '••••' };
  try {
    const num = c.number_enc ? await decryptField(c.number_enc, cmk) : '';
    const cvv = c.security_code_enc ? await decryptField(c.security_code_enc, cmk) : '';
    return { number: num, security_code: cvv };
  } catch (err) {
    console.warn('[cards] decryption failed', err);
    return { number: '✕ decrypt', security_code: '✕ decrypt' };
  }
}

export async function createCard(
  data: NewCardInput,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const settings = await getDb().settings.get(userId);
  const enc = settings?.card_encryption_enabled === true;
  const sanitized = sanitizeCard(data);
  const prepared = await maybeEncryptCard(sanitized, enc);
  const row: Card = {
    ...prepared,
    id, user_id: userId, created_at: ts, updated_at: ts,
  } as Card;
  await getDb().cards.add(row);
  enqueue('upsert', 'cards', id, cardToRemote(row));
  return id;
}

export async function updateCard(
  id: string,
  changes: Partial<Card>,
): Promise<void> {
  const ts = now();
  const existing = await getDb().cards.get(id);
  if (!existing) return;
  const settings = await getDb().settings.get(existing.user_id);
  const enc = settings?.card_encryption_enabled === true;
  const sanitized = sanitizeCard(changes);
  const prepared = await maybeEncryptCard(sanitized, enc);
  await getDb().cards.update(id, { ...prepared, updated_at: ts });
  const updated = await getDb().cards.get(id);
  if (updated) enqueue('upsert', 'cards', id, cardToRemote(updated));
}

export async function deleteCard(id: string): Promise<void> {
  await getDb().cards.delete(id);
  enqueue('delete', 'cards', id, null);
}

/** One-shot: encrypt every existing plaintext card row for this user with
 *  the current session CMK and queue the upserts. Used by the LogbookModal
 *  encryption opt-in flow. Idempotent — already-encrypted rows are skipped.
 *  Returns the number of rows newly encrypted. */
export async function migrateExistingCardsToEncrypted(userId: string): Promise<number> {
  const cmk = getSessionCmk();
  if (!cmk) throw new Error('cannot migrate: no session CMK');
  const db = getDb();
  const rows = await db.cards.where('user_id').equals(userId).toArray();
  let count = 0;
  for (const row of rows) {
    if (row.is_encrypted) continue;
    if (!row.number && !row.security_code) {
      // Still tag empty rows as encrypted so they're consistent with the new model.
      await db.cards.update(row.id, { is_encrypted: true, updated_at: Date.now() });
      const updated = await db.cards.get(row.id);
      if (updated) enqueue('upsert', 'cards', row.id, cardToRemote(updated));
      continue;
    }
    const enc: Partial<Card> = {};
    if (row.number)        enc.number_enc        = await encryptField(row.number, cmk);
    if (row.security_code) enc.security_code_enc = await encryptField(row.security_code, cmk);
    enc.number = '';
    enc.security_code = '';
    enc.is_encrypted = true;
    enc.updated_at = Date.now();
    await db.cards.update(row.id, enc);
    const updated = await db.cards.get(row.id);
    if (updated) enqueue('upsert', 'cards', row.id, cardToRemote(updated));
    count += 1;
  }
  return count;
}

function cardToRemote(c: Card): Record<string, unknown> {
  return {
    id:                c.id,
    user_id:           c.user_id,
    name:              c.name,
    kind:              c.kind,
    cardholder:        c.cardholder,
    number:            c.number,
    expires:           c.expires,
    security_code:     c.security_code,
    issuer:            c.issuer,
    notes:             c.notes,
    is_encrypted:      c.is_encrypted ?? false,
    number_enc:        c.number_enc ?? null,
    security_code_enc: c.security_code_enc ?? null,
    created_at:        new Date(c.created_at).toISOString(),
    updated_at:        new Date(c.updated_at).toISOString(),
  };
}
