/**
 * Single source of truth for input length caps.
 *
 * Mirrored server-side as CHECK constraints in migration 0009. When you
 * change a value here, update the migration too, or writes will start
 * rejecting at the database with no client-side guard.
 *
 * Caps are intentionally generous — they protect against paste-bombs and
 * accidental megabyte-pastes, not against intentional abuse (the app is
 * single-user behind Supabase auth).
 */

export const LIMITS = {
  // passwords
  password_name:      256,
  password_username:  256,
  password_password:  512,
  password_sites:    1000,
  password_note:     4000,

  // cards
  card_name:          256,
  card_cardholder:    256,
  card_number:        256,   // plaintext column
  card_security_code:  64,
  card_issuer:        256,
  card_expires:        32,
  card_notes:        4000,
  card_enc_blob:     4096,   // ciphertext blob (base64)

  // contacts
  contact_name:       256,
  contact_company:    256,
  contact_phone:       64,
  contact_email:      256,
  contact_pronouns:    64,
  contact_address:    512,
  contact_birthday:    64,
  contact_notes:     4000,

  // tasks
  task_title:         500,
  task_description: 10_000,

  // notepad
  notepad_body:    100_000,
} as const;

export type LimitKey = keyof typeof LIMITS;

/** Trim trailing whitespace, then hard-cap to `limit` characters. Non-strings
 *  pass through unchanged. */
export function clamp(value: string | null | undefined, limit: number): string {
  if (value == null) return '';
  const trimmed = String(value);
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit);
}

/** Shorthand: clamp(value, LIMITS[key]). */
export function clampFor(value: string | null | undefined, key: LimitKey): string {
  return clamp(value, LIMITS[key]);
}
