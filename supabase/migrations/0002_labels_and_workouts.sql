-- ============================================================
-- 0002 — Labels system + workout habit kind
-- ============================================================

-- ── Habit kind + per-weekday workout plan ────────────────────────────────
alter table habit_templates
  add column if not exists kind text not null default 'habit'
    check (kind in ('habit', 'workout'));

alter table habit_templates
  add column if not exists workout_data jsonb;

-- ── Per-task workout progress (sets-done counters keyed by exercise id) ──
alter table tasks
  add column if not exists workout_progress jsonb;

-- ── Labels ───────────────────────────────────────────────────────────────
create table if not exists labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#6B8A5C',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists labels_user_name_unique
  on labels (user_id, name);

create index if not exists labels_user_idx on labels (user_id);

-- ── Task ↔ Label join ────────────────────────────────────────────────────
create table if not exists task_labels (
  id          text primary key,  -- "{task_id}|{label_id}" — matches Dexie pk
  task_id     uuid not null references tasks(id) on delete cascade,
  label_id    uuid not null references labels(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create unique index if not exists task_labels_task_label
  on task_labels (task_id, label_id);

create index if not exists task_labels_user_label_idx
  on task_labels (user_id, label_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table labels       enable row level security;
alter table task_labels  enable row level security;

create policy "own" on labels for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own" on task_labels for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Updated-at trigger on labels ─────────────────────────────────────────
create trigger trg_labels_updated
  before update on labels
  for each row execute procedure touch_updated_at();
