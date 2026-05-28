-- ============================================================
-- 0007 — Logbook: contacts + cards
--
-- The Logbook unifies three lookup-table features behind the same
-- PIN gate from 0005:
--   - passwords (existing)
--   - contacts (this migration)
--   - cards    (this migration, e.g. payment cards & insurance)
--
-- Plaintext at rest (PIN is a UI gate, not encryption).
-- ============================================================

create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  company     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  pronouns    text not null default '',
  address     text not null default '',
  birthday    text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_user_idx on contacts (user_id, last_name, first_name);

alter table contacts enable row level security;

create policy "own" on contacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_contacts_updated
  before update on contacts
  for each row execute procedure touch_updated_at();


-- Cards: payment, insurance, membership — flat schema, free-form
-- enough to fit anything wallet-shaped.
create table if not exists cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  kind            text not null default 'payment'
                  check (kind in ('payment','insurance','membership','other')),
  cardholder      text not null default '',
  number          text not null default '',
  expires         text not null default '',
  security_code   text not null default '',
  issuer          text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists cards_user_idx on cards (user_id, name);

alter table cards enable row level security;

create policy "own" on cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_cards_updated
  before update on cards
  for each row execute procedure touch_updated_at();
