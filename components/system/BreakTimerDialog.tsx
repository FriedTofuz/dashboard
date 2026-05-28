'use client';

import { useEffect, useRef, useState } from 'react';
import { useBreakTimerStore } from '@/lib/store/useBreakTimerStore';
import { useStatusStore } from '@/lib/store/useStatusStore';
import { toastSuccess } from '@/lib/store/useToastStore';

const PRESETS = [5, 10, 15, 30];

/** Modal asks for a break duration; mounted once at dashboard root.
 *
 *  Two roles in one file:
 *  - Prompt dialog (when `promptOpen`) → user picks minutes, or skips.
 *  - Expiry watcher → silently sets a timeout to fire when `endsAt`
 *    arrives, toasts the user, and flips status back to Working. */
export function BreakTimerDialog() {
  const promptOpen = useBreakTimerStore((s) => s.promptOpen);
  const closePrompt = useBreakTimerStore((s) => s.closePrompt);
  const start = useBreakTimerStore((s) => s.start);
  const cancel = useBreakTimerStore((s) => s.cancel);
  const endsAt = useBreakTimerStore((s) => s.endsAt);

  // Expiry watcher — one-shot timeout that fires on endsAt. Re-arms if
  // endsAt changes (e.g., the user starts a new break before the previous
  // one finished).
  const firedRef = useRef<number | null>(null);
  useEffect(() => {
    if (endsAt == null) {
      firedRef.current = null;
      return;
    }
    // Guard against double-firing if React re-runs the effect.
    if (firedRef.current === endsAt) return;
    const delay = Math.max(0, endsAt - Date.now());
    const handle = window.setTimeout(() => {
      if (firedRef.current === endsAt) return;
      firedRef.current = endsAt;
      cancel();
      // Clear the manual flag so auto-status (Working on the next
      // task start) resumes after the break.
      useStatusStore.getState().clearManual();
      useStatusStore.getState().setAuto('working');
      toastSuccess('break over · back to working');
    }, delay);
    return () => window.clearTimeout(handle);
  }, [endsAt, cancel]);

  const [custom, setCustom] = useState('');

  if (!promptOpen) return null;

  function pick(minutes: number) {
    start(minutes);
    setCustom('');
  }

  function pickCustom(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(custom, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    pick(n);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', zIndex: 75 }}
      onClick={(e) => { if (e.target === e.currentTarget) closePrompt(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-timer-title"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(380px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 14,
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <h3
            id="break-timer-title"
            className="hand"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 600,
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            Take a break
          </h3>
          <p
            className="ui"
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            How long? We&apos;ll nudge you when it&apos;s time.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pick(m)}
              className="ui-b wobble hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--ink-soft)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                padding: '10px 0',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {m}m
            </button>
          ))}
        </div>

        <form onSubmit={pickCustom} className="row" style={{ gap: 6 }}>
          <input
            type="number"
            min={1}
            max={240}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="custom minutes"
            className="ui num"
            style={{
              flex: 1,
              border: '1.5px solid var(--ink-soft)',
              borderRadius: 6,
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
            }}
            aria-label="Custom break duration in minutes"
          />
          <button
            type="submit"
            disabled={!custom || parseInt(custom, 10) <= 0}
            className="ui-b wobble"
            style={{
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage)',
              color: 'var(--paper)',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: !custom ? 'not-allowed' : 'pointer',
              opacity: !custom ? 0.6 : 1,
            }}
          >
            Start
          </button>
        </form>

        <button
          type="button"
          onClick={closePrompt}
          className="ui hover:bg-paper-warm transition-colors"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-faint)',
            padding: '6px 0 0',
            fontSize: 12,
            cursor: 'pointer',
            alignSelf: 'center',
          }}
        >
          skip — no timer
        </button>
      </div>
    </div>
  );
}
