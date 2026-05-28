'use client';

import { getDb, type Card } from './db';
import { enqueue } from './queue';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewCardInput = Omit<
  Card,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function createCard(
  data: NewCardInput,
  userId: string,
): Promise<string> {
  const id = newId();
  const ts = now();
  const row: Card = { ...data, id, user_id: userId, created_at: ts, updated_at: ts };
  await getDb().cards.add(row);
  enqueue('upsert', 'cards', id, cardToRemote(row));
  return id;
}

export async function updateCard(
  id: string,
  changes: Partial<Card>,
): Promise<void> {
  const ts = now();
  await getDb().cards.update(id, { ...changes, updated_at: ts });
  const updated = await getDb().cards.get(id);
  if (updated) enqueue('upsert', 'cards', id, cardToRemote(updated));
}

export async function deleteCard(id: string): Promise<void> {
  await getDb().cards.delete(id);
  enqueue('delete', 'cards', id, null);
}

function cardToRemote(c: Card): Record<string, unknown> {
  return {
    id:            c.id,
    user_id:       c.user_id,
    name:          c.name,
    kind:          c.kind,
    cardholder:    c.cardholder,
    number:        c.number,
    expires:       c.expires,
    security_code: c.security_code,
    issuer:        c.issuer,
    notes:         c.notes,
    created_at:    new Date(c.created_at).toISOString(),
    updated_at:    new Date(c.updated_at).toISOString(),
  };
}
