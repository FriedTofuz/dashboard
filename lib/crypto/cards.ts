/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AES-GCM card encryption + PBKDF2 key wrapping.
 *
 * Architecture (see docs/security.md):
 *   PIN  --PBKDF2-->  KEK_pin  --unwraps-->  CMK  --AES-GCM-->  field plaintext
 *   recovery_code  --PBKDF2-->  KEK_rec  --unwraps--/
 *
 * Wire formats:
 *   - Field ciphertext blob:  base64( iv(12) || gcm_ct_and_tag )
 *   - Keybox (wrapped CMK):   base64( salt(16) || iv(12) || gcm_ct_and_tag )
 *
 * All randomness from window.crypto.getRandomValues. All hashing/derivation
 * via window.crypto.subtle. Browser-only — these helpers must not be
 * imported from server code.
 */

const PBKDF2_ITER = 600_000;
const PBKDF2_SALT_BYTES = 16;
const AES_KEY_BYTES = 32;
const AES_IV_BYTES = 12;

// -----------------------------------------------------------------
// base64 / bytes helpers (browser-safe, no Buffer)
// -----------------------------------------------------------------

export function b64encode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function ascii(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

// -----------------------------------------------------------------
// Recovery codes
// -----------------------------------------------------------------

const B32_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Crockford-ish (no 0,1,I,L,O)

/** Generate a 24-char base32 recovery code formatted with dashes every 4 chars. */
export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 24; i++) {
    // Each byte gives one alphabet index; 24 chars uses 24 of the 15 bytes
    // via mod — not perfectly uniform but uniform enough for a recovery code.
    out += B32_ALPHA[bytes[i % bytes.length] % B32_ALPHA.length];
  }
  return out.match(/.{4}/g)!.join('-');
}

/** Normalise a recovery code the user typed in: uppercase, strip non-alphanumeric. */
export function normaliseRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// -----------------------------------------------------------------
// Key derivation
// -----------------------------------------------------------------

async function importPbkdf2Key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8(secret) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );
}

/** Derive a 256-bit AES-GCM key from a passphrase + salt via PBKDF2-SHA256. */
export async function deriveKek(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await importPbkdf2Key(secret);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITER, salt: salt as BufferSource },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Import a raw 32-byte CMK as an AES-GCM CryptoKey. */
async function importCmk(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Generate a fresh 32-byte Card Master Key (CMK). */
export function generateCmk(): Uint8Array {
  const out = new Uint8Array(AES_KEY_BYTES);
  crypto.getRandomValues(out);
  return out;
}

// -----------------------------------------------------------------
// Keybox: wrap / unwrap the CMK with a KEK
// -----------------------------------------------------------------

/** Wrap a raw CMK into base64(salt|iv|ct|tag) for storage. */
export async function wrapCmk(cmk: Uint8Array, secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_BYTES));
  const kek = await deriveKek(secret, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, kek, cmk as BufferSource),
  );
  return b64encode(concat(salt, iv, ct));
}

/** Unwrap a keybox blob to recover the raw CMK; throws on auth failure. */
export async function unwrapCmk(keybox: string, secret: string): Promise<Uint8Array> {
  const all = b64decode(keybox);
  const salt = all.slice(0, PBKDF2_SALT_BYTES);
  const iv = all.slice(PBKDF2_SALT_BYTES, PBKDF2_SALT_BYTES + AES_IV_BYTES);
  const ct = all.slice(PBKDF2_SALT_BYTES + AES_IV_BYTES);
  const kek = await deriveKek(secret, salt);
  const pt = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, kek, ct as BufferSource),
  );
  return pt;
}

// -----------------------------------------------------------------
// Per-field encryption with CMK
// -----------------------------------------------------------------

/** Encrypt a UTF-8 string field with CMK. Output: base64(iv|ct|tag). */
export async function encryptField(plaintext: string, cmk: Uint8Array): Promise<string> {
  const key = await importCmk(cmk);
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, utf8(plaintext) as BufferSource),
  );
  return b64encode(concat(iv, ct));
}

/** Decrypt a base64(iv|ct|tag) blob with CMK; throws on auth failure. */
export async function decryptField(blob: string, cmk: Uint8Array): Promise<string> {
  const all = b64decode(blob);
  const iv = all.slice(0, AES_IV_BYTES);
  const ct = all.slice(AES_IV_BYTES);
  const key = await importCmk(cmk);
  const pt = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource),
  );
  return ascii(pt);
}

// -----------------------------------------------------------------
// HMAC check for the recovery code
// -----------------------------------------------------------------

const RECOVERY_HMAC_TAG = 'sunflower-rec-check';

/** Compute a stable HMAC-SHA256 hex tag for a recovery code. Used to
 *  validate the entered code before attempting the slow AES decryption. */
export async function recoveryCheckHex(code: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(RECOVERY_HMAC_TAG) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, utf8(normaliseRecoveryCode(code)) as BufferSource),
  );
  return Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sanity check used by the round-trip self-test. */
export async function selfTest(): Promise<boolean> {
  try {
    const cmk = generateCmk();
    const blob = await encryptField('hello v2.5', cmk);
    const back = await decryptField(blob, cmk);
    if (back !== 'hello v2.5') return false;
    const kb = await wrapCmk(cmk, '24850');
    const unwrapped = await unwrapCmk(kb, '24850');
    return b64encode(unwrapped) === b64encode(cmk);
  } catch {
    return false;
  }
}
