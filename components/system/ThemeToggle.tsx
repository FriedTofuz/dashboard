'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/lib/store/useThemeStore';

/** Sun / moon toggle. Cycles light → dark → system. */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const label = mode === 'light' ? 'light' : mode === 'dark' ? 'dark' : 'auto';
  const icon = mode === 'light' ? '☀' : mode === 'dark' ? '☾' : '◐';

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Theme: ${label}. Click to switch to ${next}.`}
      className="ink-box-soft px-2.5 py-1.5 ui text-[12px] muted hover:bg-paper-warm transition-colors"
      style={{ minHeight: 32, background: 'var(--paper)' }}
    >
      <span aria-hidden style={{ marginRight: 6 }}>{icon}</span>
      {label}
    </button>
  );
}
