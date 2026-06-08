'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// v2.5 client-side login lockout. Supabase's provider rate limit is the
// real defence — this layer just nudges credential-stuffing bots away
// before they hit the Supabase quota and locks the user out gracefully.
const MAX_FAILS_BEFORE_LOCKOUT = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function lockoutKey(email: string): string {
  return `sunflower:loginAttempts:${email.trim().toLowerCase()}`;
}

interface LockoutState {
  /** Epoch-ms timestamps of recent failures. Trimmed to within the window. */
  fails: number[];
  /** Epoch-ms until which the form is disabled (null = not locked). */
  lockedUntil: number | null;
}

function readLockout(email: string): LockoutState {
  if (typeof window === 'undefined') return { fails: [], lockedUntil: null };
  try {
    const raw = window.localStorage.getItem(lockoutKey(email));
    if (!raw) return { fails: [], lockedUntil: null };
    const parsed = JSON.parse(raw) as LockoutState;
    const now = Date.now();
    const recent = (parsed.fails ?? []).filter((t) => now - t < LOCKOUT_WINDOW_MS);
    const lockedUntil = parsed.lockedUntil && parsed.lockedUntil > now ? parsed.lockedUntil : null;
    return { fails: recent, lockedUntil };
  } catch {
    return { fails: [], lockedUntil: null };
  }
}

function writeLockout(email: string, state: LockoutState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(lockoutKey(email), JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearLockout(email: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(lockoutKey(email)); } catch { /* ignore */ }
}

function formatLockedUntil(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** Re-read lockout state whenever email changes so the form reflects the
   *  current cooldown for the typed email. */
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!email) { setLockedUntil(null); return; }
    const s = readLockout(email);
    setLockedUntil(s.lockedUntil);
  }, [email]);

  // Tick once a minute so the countdown text auto-updates without manual
  // refresh. Cheap: only renders the form once.
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => {
      if (Date.now() >= lockedUntil) setLockedUntil(null);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) return;

    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      // Record the failure.
      const state = readLockout(email);
      const now = Date.now();
      const fails = [...state.fails, now].filter((t) => now - t < LOCKOUT_WINDOW_MS);
      let nextLockedUntil = state.lockedUntil;
      if (fails.length >= MAX_FAILS_BEFORE_LOCKOUT) {
        nextLockedUntil = now + LOCKOUT_WINDOW_MS;
      }
      writeLockout(email, { fails, lockedUntil: nextLockedUntil });
      setLockedUntil(nextLockedUntil);
      return;
    }
    clearLockout(email);
    router.push('/');
    router.refresh();
  }

  const isLocked = lockedUntil != null && Date.now() < lockedUntil;
  const disableSubmit = loading || isLocked;

  return (
    <div className="min-h-screen center paper">
      <form
        onSubmit={handleLogin}
        className="ink-box-soft col gap-6 p-8"
        style={{ maxWidth: 360, width: '100%' }}
      >
        <div className="col gap-1">
          <h1 className="font-hand text-h1">
            <span className="underline-hand">sunflower</span>
          </h1>
          <p className="font-hand text-body-sm muted">personal productivity dashboard</p>
        </div>

        <div className="col gap-2">
          <label className="tiny" htmlFor="email">email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            autoComplete="email"
            className="font-hand text-body bg-transparent border-b py-1 focus:outline-none placeholder:text-ink-faint"
            style={{ borderColor: 'var(--ink-faint)' }}
          />
        </div>

        <div className="col gap-2">
          <label className="tiny" htmlFor="password">password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="font-hand text-body bg-transparent border-b py-1 focus:outline-none"
            style={{ borderColor: 'var(--ink-faint)' }}
          />
        </div>

        {error && !isLocked && <p className="tiny text-terra">{error}</p>}
        {isLocked && lockedUntil && (
          <p className="tiny text-terra" style={{ lineHeight: 1.4 }}>
            too many attempts — try again at {formatLockedUntil(lockedUntil)}
          </p>
        )}

        <button
          type="submit"
          disabled={disableSubmit}
          className="ink-box font-hand text-body px-6 py-2 hover:wash-sage transition-colors disabled:opacity-50"
        >
          {loading ? 'signing in…' : isLocked ? 'locked' : 'sign in'}
        </button>
      </form>
    </div>
  );
}
