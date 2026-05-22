-- ============================================================
-- 0004 — Habit title preservation + day-logged flag
--
-- habit_title: snapshot of the habit template's title at the moment
-- the instance was materialized. Lets completed instances continue
-- to render in the habit section after the parent template is
-- deleted (we null template_id so the FK cascade doesn't kill them).
--
-- days.logged_at: timestamp when the user explicitly "logged" the
-- day via the Log Day button. Only logged days count toward Week
-- avg / streak / cumulative stats; unlogged days render blank.
-- ============================================================

alter table tasks
  add column if not exists habit_title text;

alter table days
  add column if not exists logged_at timestamptz;
