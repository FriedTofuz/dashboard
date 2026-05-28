'use client';

import { getDb, type Contact } from './db';
import { enqueue } from './queue';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewContactInput = Omit<
  Contact,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function createContact(
  data: NewContactInput,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const row: Contact = { ...data, id, user_id: userId, created_at: ts, updated_at: ts };
  await getDb().contacts.add(row);
  enqueue('upsert', 'contacts', id, contactToRemote(row));
  return id;
}

export async function updateContact(
  id: string,
  changes: Partial<Contact>,
): Promise<void> {
  const ts = now();
  await getDb().contacts.update(id, { ...changes, updated_at: ts });
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
