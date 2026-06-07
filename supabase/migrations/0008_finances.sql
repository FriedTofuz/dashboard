-- ============================================================
-- 0008 — Financial planner
--
-- One weekly entry per user (total spending + income + note),
-- plus four budget fields on the settings singleton: monthly
-- budget, monthly allowance, savings target, and target date.
--
-- All money is stored as integer cents to avoid float drift.
-- ============================================================

create table if not exists finance_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start      date not null,          -- Monday of the week
  spending_cents  integer not null default 0 check (spending_cents >= 0),
  income_cents    integer not null default 0 check (income_cents >= 0),
  note            text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One entry per (user, week) — upserts use this to detect collisions.
create unique index if not exists finance_entries_user_week_unique
  on finance_entries (user_id, week_start);

create index if not exists finance_entries_user_idx
  on finance_entries (user_id, week_start desc);

alter table finance_entries enable row level security;

create policy "own" on finance_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_finance_entries_updated
  before update on finance_entries
  for each row execute procedure touch_updated_at();

-- Budget plan lives alongside the rest of the user's prefs on settings.
alter table settings
  add column if not exists finance_monthly_budget_cents    integer,
  add column if not exists finance_monthly_allowance_cents integer,
  add column if not exists finance_savings_target_cents    integer,
  add column if not exists finance_savings_target_by       date;
