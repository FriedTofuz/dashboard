-- ============================================================
-- 0010 — Lock down rls_auto_enable() executability
--
-- The original 0009 attempt at this used:
--     revoke execute on function rls_auto_enable() from anon, authenticated;
-- which leaves the function callable because Postgres grants EXECUTE
-- to PUBLIC by default, and both `anon` and `authenticated` inherit
-- from PUBLIC. The Supabase advisor flagged both anon + authenticated
-- could still call it.
--
-- This migration revokes from PUBLIC as well so the advisor warning
-- clears. The function remains callable by the `postgres` role for
-- ops use.
-- ============================================================

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
