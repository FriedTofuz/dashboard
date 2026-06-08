'use client';

import { getDb, type Contact } from './db';
import { enqueue } from './queue';
import { clamp, LIMITS } from '@/lib/validation/limits';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewContactInput = Omit<
  Contact,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/** v2.5 length caps. Mirrors CHECK constraints in migration 0009. */
function sanitizeContact<T extends Partial<Contact>>(c: T): T {
  const out = { ...c };
  if (out.first_name !== undefined) out.first_name = clamp(out.first_name, LIMITS.contact_name);
  if (out.last_name  !== undefined) out.last_name  = clamp(out.last_name, LIMITS.contact_name);
  if (out.company    !== undefined) out.company    = clamp(out.company, LIMITS.contact_company);
  if (out.phone      !== undefined) out.phone      = clamp(out.phone, LIMITS.contact_phone);
  if (out.email      !== undefined) out.email      = clamp(out.email, LIMITS.contact_email);
  if (out.pronouns   !== undefined) out.pronouns   = clamp(out.pronouns, LIMITS.contact_pronouns);
  if (out.address    !== undefined) out.address    = clamp(out.address, LIMITS.contact_address);
  if (out.birthday   !== undefined) out.birthday   = clamp(out.birthday, LIMITS.contact_birthday);
  if (out.notes      !== undefined) out.notes      = clamp(out.notes, LIMITS.contact_notes);
  return out;
}

export async function createContact(
  data: NewContactInput,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const row: Contact = {
    ...sanitizeContact(data),
    id, user_id: userId, created_at: ts, updated_at: ts,
  };
  await getDb().contacts.add(row);
  enqueue('upsert', 'contacts', id, contactToRemote(row));
  return id;
}

export async function updateContact(
  id: string,
  changes: Partial<Contact>,
): Promise<void> {
  const ts = now();
  const safe = sanitizeContact(changes);
  await getDb().contacts.update(id, { ...safe, updated_at: ts });
  const updated = await getDb().contacts.get(id);
  if (updated) enqueue('upsert', 'contacts', id, contactToRemote(updated));
}

export async function deleteContact(id: string): Promise<void> {
  await getDb().contacts.delete(id);
  enqueue('delete', 'contacts', id, null);
}

function contactToRemote(c: Contact): Record<string, unknown> {
  return {
    id:         c.id,
    user_id:    c.user_id,
    first_name: c.first_name,
    last_name:  c.last_name,
    company:    c.company,
    phone:      c.phone,
    email:      c.email,
    pronouns:   c.pronouns,
    address:    c.address,
    birthday:   c.birthday,
    notes:      c.notes,
    created_at: new Date(c.created_at).toISOString(),
    updated_at: new Date(c.updated_at).toISOString(),
  };
}
