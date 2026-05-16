'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
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
      return;
    }
    router.push('/');
    router.refresh();
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

        {error && <p className="tiny text-terra">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="ink-box font-hand text-body px-6 py-2 hover:wash-sage transition-colors disabled:opacity-50"
        >
          {loading ? 'signing in…' : 'sign in'}
        </button>
      </form>
    </div>
  );
}
