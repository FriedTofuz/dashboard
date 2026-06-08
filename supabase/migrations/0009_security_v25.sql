-- ============================================================
-- 0009 — v2.5 security pass
--
-- Three things in one migration:
--
-- 1. Per-row encryption of `cards.number` and `cards.security_code`
--    using a two-tier key system (CMK wrapped by PIN-KEK and
--    recovery-KEK, both PBKDF2-SHA256 -> AES-GCM). Plaintext
--    columns stay (text not null default '') so existing rows
--    continue to load — encrypted rows hold '' in the plain
--    columns and base64(iv|ct|tag) in the *_enc columns.
--
-- 2. UI knob: `settings.ui_max_width_px` so the desktop main
--    column width is configurable from Settings -> Display.
--    null = use default (1500), 0 = no cap (Full).
--
-- 3. Server-side length CHECKs on the longest plaintext fields,
--    matching the lib/validation/limits.ts source of truth.
--
-- 4. Two Supabase advisor fixes:
--    - pin `touch_updated_at()` search_path
--    - revoke EXECUTE on `rls_auto_enable()` from anon/auth
-- ============================================================

-- --- Encryption + UI knob columns on settings -------------
alter table settings
  add column if not exists card_encryption_enabled boolean not null default false,
  add column if not exists card_pin_keybox         text,   -- base64(salt|iv|ciphertext|tag)
  add column if not exists card_recovery_keybox    text,   -- base64(salt|iv|ciphertext|tag)
  add column if not exists card_recovery_check     text,   -- hex HMAC-SHA256(recovery_code, "sunflower-rec-check")
  add column if not exists ui_max_width_px         integer;

-- Width must be one of the allowed presets (or null).
-- 0 means "no cap / Full"; the four numeric values match
-- the SettingsModal dropdown.
alter table settings
  drop constraint if exists settings_ui_max_width_check;
alter table settings
  add constraint settings_ui_max_width_check
  check (ui_max_width_px is null or ui_max_width_px in (0, 1200, 1500, 1700, 1920));

-- --- Cards: encrypted columns -----------------------------
alter table cards
  add column if not exists number_enc        text,
  add column if not exists security_code_enc text,
  add column if not exists is_encrypted      boolean not null default false;

-- When a row is_encrypted, the plaintext columns must be empty.
-- When it is not, *_enc must be null. This stops mixed-state rows.
alter table cards
  drop constraint if exists cards_enc_consistency_check;
alter table cards
  add constraint cards_enc_consistency_check
  check (
    (is_encrypted = false and number_enc is null and security_code_enc is null)
    or
    (is_encrypted = true and number = '' and security_code = '')
  );

-- --- Length caps (matches lib/validation/limits.ts) ------
alter table passwords
  drop constraint if exists passwords_len_check;
alter table passwords
  add constraint passwords_len_check check (
    length(coalesce(name, ''))     <= 256 and
    length(coalesce(username, '')) <= 256 and
    length(coalesce(password, '')) <= 512 and
    length(coalesce(sites, ''))    <= 1000 and
    length(coalesce(note, ''))     <= 4000
  );

alter table cards
  drop constraint if exists cards_len_check;
alter table cards
  add constraint cards_len_check check (
    length(coalesce(name, ''))          <= 256 and
    length(coalesce(cardholder, ''))    <= 256 and
    length(coalesce(number, ''))        <= 256 and
    length(coalesce(security_code, '')) <= 64  and
    length(coalesce(issuer, ''))        <= 256 and
    length(coalesce(expires, ''))       <= 32  and
    length(coalesce(notes, ''))         <= 4000 and
    length(coalesce(number_enc, ''))        <= 4096 and
    length(coalesce(security_code_enc, '')) <= 4096
  );

alter table contacts
  drop constraint if exists contacts_len_check;
alter table contacts
  add constraint contacts_len_check check (
    length(coalesce(first_name, '')) <= 256 and
    length(coalesce(last_name, ''))  <= 256 and
    length(coalesce(company, ''))    <= 256 and
    length(coalesce(phone, ''))      <= 64  and
    length(coalesce(email, ''))      <= 256 and
    length(coalesce(pronouns, ''))   <= 64  and
    length(coalesce(address, ''))    <= 512 and
    length(coalesce(birthday, ''))   <= 64  and
    length(coalesce(notes, ''))      <= 4000
  );

alter table tasks
  drop constraint if exists tasks_len_check;
alter table tasks
  add constraint tasks_len_check check (
    length(coalesce(title, ''))       <= 500 and
    length(coalesce(description, '')) <= 10000
  );

alter table notepad_pages
  drop constraint if exists notepad_pages_len_check;
alter table notepad_pages
  add constraint notepad_pages_len_check check (
    length(coalesce(body, '')) <= 100000
  );

-- --- Advisor fixes ---------------------------------------
alter function public.touch_updated_at() set search_path = public, pg_temp;

revoke execute on function public.rls_auto_enable() from anon, authenticated;
