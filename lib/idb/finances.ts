'use client';

import { getDb, type FinanceEntry, type Settings } from './db';
import { enqueue } from './queue';

function now() { return Date.now(); }
function newId() { return crypto.randomUUID(); }

export type NewFinanceEntryInput = Omit<
  FinanceEntry,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function upsertWeeklyEntry(
  data: NewFinanceEntryInput,
  userId: string,
): Promise<string> {
  const db = getDb();
  const existing = await db.finance_entries
    .where('[user_id+week_start]')
    .equals([userId, data.week_start])
    .first();

  const ts = now();
  if (existing) {
    const next: FinanceEntry = {
      ...existing,
      spending_cents: data.spending_cents,
      income_cents: data.income_cents,
      note: data.note,
      updated_at: ts,
    };
    await db.finance_entries.put(next);
    enqueue('upsert', 'finance_entries', existing.id, financeEntryToRemote(next));
    return existing.id;
  }

  const id = newId();
  const row: FinanceEntry = {
    ...data,
    id,
    user_id: userId,
    created_at: ts,
    updated_at: ts,
  };
  await db.finance_entries.add(row);
  enqueue('upsert', 'finance_entries', id, financeEntryToRemote(row));
  return id;
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  await getDb().finance_entries.delete(id);
  enqueue('delete', 'finance_entries', id, null);
}

function financeEntryToRemote(e: FinanceEntry): Record<string, unknown> {
  return {
    id:             e.id,
    user_id:        e.user_id,
    week_start:     e.week_start,
    spending_cents: e.spending_cents,
    income_cents:   e.income_cents,
    note:           e.note,
    created_at:     new Date(e.created_at).toISOString(),
    updated_at:     new Date(e.updated_at).toISOString(),
  };
}

// ── Budget plan on settings ──────────────────────────────────────────────

export interface FinancePlan {
  monthly_budget_cents:    number | null;
  monthly_allowance_cents: number | null;
  savings_target_cents:    number | null;
  savings_target_by:       string | null;
}

export async function updateFinancePlan(
  userId: string,
  plan: Partial<FinancePlan>,
): Promise<void> {
  const ts = now();
  const db = getDb();
  const settings = await db.settings.get(userId);
  if (!settings) return;
  const next: Settings = {
    ...settings,
    finance_monthly_budget_cents:    plan.monthly_budget_cents    ?? settings.finance_monthly_budget_cents    ?? null,
    finance_monthly_allowance_cents: plan.monthly_allowance_cents ?? settings.finance_monthly_allowance_cents ?? null,
    finance_savings_target_cents:    plan.savings_target_cents    ?? settings.finance_savings_target_cents    ?? null,
    finance_savings_target_by:       plan.savings_target_by       ?? settings.finance_savings_target_by       ?? null,
    updated_at: ts,
  };
  await db.settings.put(next);
  enqueue('upsert', 'settings', userId, {
    user_id: userId,
    finance_monthly_budget_cents:    next.finance_monthly_budget_cents,
    finance_monthly_allowance_cents: next.finance_monthly_allowance_cents,
    finance_savings_target_cents:    next.finance_savings_target_cents,
    finance_savings_target_by:       next.finance_savings_target_by,
    updated_at: new Date(ts).toISOString(),
  });
}

// ── Date helpers ─────────────────────────────────────────────────────────

/** Monday of the week containing the given date, in YYYY-MM-DD. */
export function weekStart(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  // JS: Sunday=0, Monday=1, ... Saturday=6. Shift so Monday=0.
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return toDateKey(date);
}

/** YYYY-MM (current month) for the given date. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

/** Whether a week_start string falls inside the same month as `monthDate`. */
export function weekInMonth(weekStartIso: string, monthDate: Date): boolean {
  const [y, m] = weekStartIso.split('-').map((s) => parseInt(s, 10));
  return y === monthDate.getFullYear() && m === monthDate.getMonth() + 1;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a cents value as `$1,234.56`. Negative values prefix with `-$`. */
export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const formatted = `$${dollars.toLocaleString()}.${rem.toString().padStart(2, '0')}`;
  return negative ? `-${formatted}` : formatted;
}

/** Parse `$1,234.56` (or `1234.56`, or `1234`) into integer cents. Returns
 *  null when the input can't be made sense of. */
export function parseMoney(input: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const f = parseFloat(cleaned);
  if (!Number.isFinite(f)) return null;
  return Math.round(f * 100);
}
