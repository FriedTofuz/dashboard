# Sunflower — Security Model

This document describes what Sunflower defends against, what it intentionally
does not, and how the Logbook's PIN gate, card encryption, and recovery code
flow work. It is the single point of reference for the security posture
shipped in v2.5.

## Threat model

**Sunflower is a single-user, personal productivity dashboard.** It is not a
public service, it has no multi-tenancy, and it is not a secrets manager.
The bar is "good enough that a casual attacker cannot read your card numbers
from a stolen laptop or an exposed Supabase backup."

| Category | Defended? | Notes |
|---|---|---|
| Network eavesdropping | yes | HSTS + Supabase TLS |
| CSRF | yes | HttpOnly cookies via `@supabase/ssr`, `SameSite=Lax` |
| XSS via React DOM | yes | No `dangerouslySetInnerHTML` in component tree |
| Clickjacking | yes | `X-Frame-Options: DENY` |
| Server-side row exposure (Supabase) | yes | RLS on every user-data table, policy `auth.uid() = user_id` |
| Plaintext card numbers in Supabase | yes (v2.5+) | AES-GCM with PIN-derived KEK |
| Credential stuffing on login | partial | Supabase provider rate limit + 5-fail/15-min client lockout |
| Compromised browser, OS, or hardware | **no** | If your machine is owned, so are your secrets |
| Malicious browser extension | **no** | Anything in the DOM is readable by an extension |
| Forgotten PIN with no recovery code | **no** | Card data is unrecoverable. Save the recovery code. |
| Server breach where attacker reads memory | **no** | Out of scope for a hobby dashboard |
| Coercion / shoulder surfing | **no** | Out of scope |

## What is encrypted, what is not

| Field | Storage | Notes |
|---|---|---|
| `cards.number` | AES-GCM ciphertext in `cards.number_enc` | Plaintext column is set to `''` on encrypted rows |
| `cards.security_code` (CVV / group #) | AES-GCM ciphertext in `cards.security_code_enc` | Same as above |
| All other `cards.*` fields | Plaintext | Cardholder name, issuer, expiry, notes |
| `passwords.*` | Plaintext | UI is PIN-gated. Not encrypted. |
| `contacts.*` | Plaintext | UI is PIN-gated. Not encrypted. |
| `tasks`, `notepad_pages`, etc. | Plaintext | No PIN gate. Behind login only. |

Encryption is scoped to the highest-risk fields (card numbers + CVVs) for
v2.5. Passwords stay plaintext because losing access to them via forgotten
PIN was deemed a worse failure mode than the security upside of encryption.

## Key hierarchy

```
PIN  ───PBKDF2-SHA256 (600,000 iter)───►  KEK_pin
                                              │
                                              ▼
                                  unwraps  Card Master Key (CMK)
                                              │
                                              │
recovery code ──PBKDF2-SHA256 (600,000 iter)──┘  KEK_rec  ──► unwraps CMK

CMK ──AES-GCM (per-row 12-byte IV)──► encrypts card secret fields
```

- **CMK** is a random 32-byte key generated once on encryption opt-in. It is
  *never* stored in plaintext on disk or on the server. It lives in
  memory only while the Logbook is unlocked, and is cleared on lock or page
  navigation.
- **KEK_pin** is derived fresh from the PIN every time the user unlocks.
- **KEK_rec** is derived from the recovery code only when the user clicks
  *Forgot PIN → enter recovery code* in the Logbook.
- Both KEKs **wrap the same CMK** into separate base64 blobs stored in
  `settings.card_pin_keybox` and `settings.card_recovery_keybox`.
- Changing the PIN re-derives `KEK_pin` and re-wraps CMK into a new
  `card_pin_keybox`. **Card rows are not re-encrypted** on PIN change.

### Why PBKDF2 with 600,000 iterations?

OWASP's 2023 recommendation for PBKDF2-SHA256. ~250 ms on a 2024 MacBook,
acceptable on first unlock and fast enough that derived keys are not cached.

### Why GCM and not CBC?

GCM gives authentication for free; if a row's ciphertext is tampered with
(or pulled in from a different user's row by a Supabase RLS misconfiguration
bug), decryption fails with a clean error instead of returning garbage.

## Recovery code

On encryption opt-in, the Logbook generates a 24-character base32 recovery
code formatted as `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`. It is shown **once**, in
a copy-to-clipboard modal that requires the user to check an acknowledgement
box before continuing.

**Storage of the recovery code:**

- The code itself is never persisted.
- `settings.card_recovery_check` holds `HMAC-SHA256(recovery_code, "sunflower-rec-check")`
  so that an entered code can be validated before attempting AES decryption.
- `settings.card_recovery_keybox` holds CMK wrapped by `KEK_rec`.

If the user enters the correct recovery code, the Logbook decrypts CMK,
keeps it in memory for the session, and prompts them to set a new PIN. The
new PIN re-derives `KEK_pin` and re-wraps CMK into a new `card_pin_keybox`.

**If the recovery code is lost and the PIN is forgotten, card secret
fields are permanently unrecoverable.** Sunflower has no escape hatch, by
design — anything else would be a backdoor.

## Length limits

Every text field that accepts user input has a server-side `CHECK`
constraint plus a client-side `clamp()` mirror in `lib/validation/limits.ts`.
Paste-bomb attempts are silently truncated before write. Caps are intentionally
generous (4 KB for notes, 100 KB for notepad pages).

## Security headers

Applied via `next.config.mjs` `async headers()`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — locks `connect-src` to Supabase + self,
  `frame-ancestors 'none'`, `base-uri 'self'`. Allows `'unsafe-inline'` for
  scripts and styles because Next 14 inline boot code requires it; this
  matches the prior posture (no CSP at all) but adds meaningful protection
  against script injection from cross-origin sources.

## Operational notes

- The Supabase advisor flagged `touch_updated_at()` as `search_path` mutable
  and `rls_auto_enable()` as anonymously executable. Both are fixed in
  migration `0009_security_v25.sql`.
- All database tables that hold user data have RLS enabled with the
  `auth.uid() = user_id` policy.
- Push notification subscriptions are user-scoped; the cron worker uses
  the service role only on the server.
