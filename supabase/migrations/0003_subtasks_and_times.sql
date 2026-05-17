-- ============================================================
-- 0003 — Subtasks (jsonb checklist) + optional task time range
-- ============================================================

alter table tasks
  add column if not exists subtasks   jsonb,
  add column if not exists start_time text,
  add column if not exists end_time   text;
