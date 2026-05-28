-- ============================================================
-- 0006 — Day rest flag (Away status)
--
-- When the user sets their current status to "Away", today's day
-- record is marked `away = true` and logged. Rest days render in
-- the streak strip with the secondary accent (ochre / gold) and
-- are skipped by the streak count (neither extend nor break).
-- ============================================================

alter table days
  add column if not exists away boolean not null default false;
