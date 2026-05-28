-- ============================================================
-- 0005 — Password manager
--
-- A simple per-user password store, gated behind a PIN saved on
-- the user's settings row (sha256 hash, default seeded from the
-- client on first run). Storage is plaintext at rest — the PIN
-- is a UI gate, not an encryption key. Keep your account safe.
-- ============================================================

create table if not exists passwords (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  username    text not null default '',
  password    text not null default '',
  sites       text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists passwords_user_idx on passwords (user_id, name);

alter table passwords enable row level security;

create policy "own" on passwords for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_passwords_updated
  before update on passwords
  for each row execute procedure touch_updated_at();

-- PIN hash lives on settings so it follows the user across devices.
alter table settings
  add column if not exists password_pin_hash text;
