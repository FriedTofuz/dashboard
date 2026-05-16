-- ============================================================
-- Sunflower Dashboard — initial schema
-- Run once in Supabase SQL editor (or via supabase db push)
-- ============================================================

-- Habit templates (recurring rules; task instances spawn from these)
create table if not exists habit_templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title           text not null,
  est_minutes     int  not null default 10,
  recurrence      text not null check (recurrence in ('daily','weekday','weekly','custom')),
  recurrence_days int[],                          -- 0–6 (Sun–Sat), for weekly/custom
  weight          numeric not null default 1.0,   -- relative weight in the 25% habits slice
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- Tasks: one-off tasks + materialized habit instances + R3 assignments
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_key         date,                            -- null = backlog
  template_id     uuid references habit_templates(id) on delete cascade,
  title           text not null,
  description     text,
  est_minutes     int  not null default 25,
  state           text not null default 'open'
                  check (state in ('open','running','paused','done')),
  started_at      timestamptz,                     -- start of current run; null when not running
  elapsed_ms      bigint not null default 0,       -- accumulated across pauses
  actual_ms       bigint,                          -- finalized on completion
  completed_at    timestamptz,
  completion_note text,
  r3_slot         int check (r3_slot in (1,2,3)),
  sort_order      numeric not null default 0,      -- fractional for drag reorder
  skipped         boolean not null default false,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Ensure at most one task per R3 slot per day (excluding archived)
create unique index if not exists tasks_r3_unique
  on tasks (user_id, day_key, r3_slot)
  where r3_slot is not null and archived = false;

create index if not exists tasks_user_day_idx      on tasks (user_id, day_key);
create index if not exists tasks_user_template_idx on tasks (user_id, template_id, day_key);
create index if not exists tasks_active_idx        on tasks (user_id, state)
  where state in ('open','running','paused');

-- Per-day record: notes, cumulative deficit snapshot, flower state
create table if not exists days (
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_key         date not null,
  notes           text not null default '',
  flower_state    text not null default 'healthy'
                  check (flower_state in ('thriving','healthy','drooping','wilting')),
  deficit_seconds int not null default 0,          -- end-of-day snapshot for archive
  primary key (user_id, day_key)
);

-- Timer audit log — used for reconstruction and debugging
create table if not exists timer_events (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  event_type  text not null
              check (event_type in ('start','pause','resume','heartbeat','stop','complete')),
  occurred_at timestamptz not null default now()
);

create index if not exists timer_events_task_idx on timer_events (task_id, occurred_at desc);

-- Notepad pages (chip-tabbed on mobile; daily scratch on desktop)
create table if not exists notepad_pages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title         text not null,
  body          text not null default '',
  archived      boolean not null default false,
  archived_at   timestamptz,
  archived_range daterange,
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);

create index if not exists notepad_user_idx on notepad_pages (user_id, archived);

-- Settings singleton — also holds the cumulative deficit tally
create table if not exists settings (
  user_id             uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  range_window_days   int not null default 5,
  deficit_seconds     int not null default 0,      -- cumulative running tally (never resets)
  push_subscription   jsonb,
  reduced_motion      boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- Auto-update updated_at on tasks and related tables
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_tasks_updated
  before update on tasks
  for each row execute procedure touch_updated_at();

create trigger trg_notepad_updated
  before update on notepad_pages
  for each row execute procedure touch_updated_at();

create trigger trg_settings_updated
  before update on settings
  for each row execute procedure touch_updated_at();

-- Row Level Security — every table is locked to auth.uid()
alter table habit_templates enable row level security;
alter table tasks           enable row level security;
alter table days            enable row level security;
alter table timer_events    enable row level security;
alter table notepad_pages   enable row level security;
alter table settings        enable row level security;

create policy "own" on habit_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on days for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on timer_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on notepad_pages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
