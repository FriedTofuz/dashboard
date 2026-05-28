'use client';

import { useEffect, useRef, useState } from 'react';
import { useBreakTimerStore } from '@/lib/store/useBreakTimerStore';
import { useStatusStore } from '@/lib/store/useStatusStore';
import { toastSuccess } from '@/lib/store/useToastStore';

const PRESETS = [5, 10, 15, 30];

/** Modal mounted once at the dashboard root with two roles:
 *
 *  1. Picker: user picks a duration (5 / 10 / 15 / 30 / custom).
 *  2. Live countdown: once a break is started, the dialog stays visible per
 *     v2.4.1 spec — showing the remaining time, with an "End break" option
 *     and an × to dismiss the popup without canceling the timer (the status
 *     pill keeps ticking).
 *
 *  Plus a silent expiry watcher that fires when `endsAt` arrives: toasts the
 *  user, clears the manual flag, and flips status back to Working. */
export function BreakTimerDialog() {
  const promptOpen = useBreakTimerStore((s) => s.promptOpen);
  const closePrompt = useBreakTimerStore((s) => s.closePrompt);
  const start = useBreakTimerStore((s) => s.start);
  const cancel = useBreakTimerStore((s) => s.cancel);
  const endsAt = useBreakTimerStore((s) => s.endsAt);
  const durationMs = useBreakTimerStore((s) => s.durationMs);

  // Expiry watcher — one-shot timeout that fires on endsAt. Re-arms if
  // endsAt changes (e.g., the user starts a new break before the previous
  // one finished).
  const firedRef = useRef<number | null>(null);
  useEffect(() => {
    if (endsAt == null) {
      firedRef.current = null;
      return;
    }
    if (firedRef.current === endsAt) return;
    const delay = Math.max(0, endsAt - Date.now());
    const handle = window.setTimeout(() => {
      if (firedRef.current === endsAt) return;
      firedRef.current = endsAt;
      cancel();
      useStatusStore.getState().clearManual();
      useStatusStore.getState().setAuto('working');
      toastSuccess('break over · back to working');
    }, delay);
    return () => window.clearTimeout(handle);
  }, [endsAt, cancel]);

  // Tick-driven re-render once a second so the countdown view updates.
  const [, force] = useState(0);
  useEffect(() => {
    if (endsAt == null) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const [custom, setCustom] = useState('');

  if (!promptOpen) return null;

  const counting = endsAt != null;

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
          position: 'relative',
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(380px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 14,
        }}
      >
        {/* Top-right close: dismisses popup without canceling the timer. */}
        <button
          type="button"
          onClick={closePrompt}
          aria-label="Close popup"
          title="Close popup (timer keeps running)"
          className="ui hover:bg-paper-warm transition-colors"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-faint)',
            fontSize: 20,
            lineHeight: 1,
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {counting ? (
          <CountdownView endsAt={endsAt!} durationMs={durationMs} onEnd={cancel} />
        ) : (
          <PickerView
            custom={custom}
            setCustom={setCustom}
            onPickPreset={pick}
            onPickCustom={pickCustom}
            onSkip={closePrompt}
          />
        )}
      </div>
    </div>
  );
}

// ── Picker view ─────────────────────────────────────────────────────────

function PickerView({
  custom, setCustom, onPickPreset, onPickCustom, onSkip,
}: {
  custom: string;
  setCustom: (v: string) => void;
  onPickPreset: (m: number) => void;
  onPickCustom: (e: React.FormEvent) => void;
  onSkip: () => void;
}) {
  return (
    <>
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
            onClick={() => onPickPreset(m)}
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

      <form onSubmit={onPickCustom} className="row" style={{ gap: 6 }}>
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
        onClick={onSkip}
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
    </>
  );
}

// ── Countdown view ──────────────────────────────────────────────────────

function CountdownView({
  endsAt, durationMs, onEnd,
}: {
  endsAt: number;
  durationMs: number | null;
  onEnd: () => void;
}) {
  const remaining = Math.max(0, endsAt - Date.now());
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);

  const total = durationMs ?? remaining;
  const elapsed = Math.max(0, Math.min(total, total - remaining));
  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <>
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
          On break
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
          We&apos;ll nudge you when it&apos;s time to come back.
        </p>
      </div>

      <div
        className="col items-center"
        style={{
          padding: '6px 0',
          gap: 8,
        }}
      >
        <span
          className="num"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.02em',
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-live="polite"
        >
          {m}:{s.toString().padStart(2, '0')}
        </span>
        <div
          aria-hidden
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: 'var(--paper-warm)',
            overflow: 'hidden',
            border: '1px solid var(--rule)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--ochre)',
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onEnd}
        className="ui-b wobble hover:bg-paper-warm transition-colors"
        style={{
          border: '1.5px solid var(--ink-soft)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          padding: '10px 14px',
          borderRadius: 6,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        End break now
      </button>
    </>
  );
}
