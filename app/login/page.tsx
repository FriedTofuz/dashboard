'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (authError) setError(authError.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen center paper">
        <div className="ink-box-soft col gap-4 p-8" style={{ maxWidth: 360 }}>
          <h1 className="font-hand text-h2">check your email</h1>
          <p className="font-hand text-body muted">
            a magic link is on its way to <strong>{email}</strong>. click it to sign in.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="tiny hover:text-ink transition-colors"
          >
            use a different email
          </button>
        </div>
      </div>
    );
  }

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
            className="font-hand text-body bg-transparent border-b py-1 focus:outline-none placeholder:text-ink-faint"
            style={{ borderColor: 'var(--ink-faint)' }}
          />
        </div>

        {error && <p className="tiny text-terra">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="ink-box font-hand text-body px-6 py-2 hover:wash-sage transition-colors disabled:opacity-50"
        >
          {loading ? 'sending…' : 'send magic link'}
        </button>
      </form>
    </div>
  );
}
