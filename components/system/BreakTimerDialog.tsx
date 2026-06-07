'use client';

import { useEffect, useRef, useState } from 'react';
import { useBreakTimerStore } from '@/lib/store/useBreakTimerStore';
import { useStatusStore } from '@/lib/store/useStatusStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { adjustDeficit } from '@/lib/idb/settings';

const PRESETS = [5, 10, 15, 30];

interface BreakTimerDialogProps {
  userId: string;
}

/** Break-timer dialog mounted at the dashboard root. Three modes:
 *
 *  1. Picker (no break running) — pick a duration.
 *  2. Running (endsAt in the future) — live mm:ss countdown + "End break now".
 *  3. Overtime (endsAt in the past) — negative -mm:ss + "Resume work". The
 *     overtime delta is added to the user's running time-deficit counter on
 *     resume, per the v2.4.0 spec ("-10:00 is 10 minutes overtime, add this
 *     to time deficit").
 *
 *  Ending the break (either manually pre-zero or via Resume work post-zero)
 *  switches status back to Working and clears the manual flag so the next
 *  start-timer auto-set still kicks in.
 */
export function BreakTimerDialog({ userId }: BreakTimerDialogProps) {
  const promptOpen = useBreakTimerStore((s) => s.promptOpen);
  const closePrompt = useBreakTimerStore((s) => s.closePrompt);
  const start = useBreakTimerStore((s) => s.start);
  const cancel = useBreakTimerStore((s) => s.cancel);
  const endsAt = useBreakTimerStore((s) => s.endsAt);
  const durationMs = useBreakTimerStore((s) => s.durationMs);

  // Cross-zero toast — fires exactly once per timer when remaining transitions
  // from positive to negative. We DON'T cancel here anymore (v2.4.0): the
  // countdown keeps ticking into negatives so the user can see how far past
  // their break they've drifted before clicking Resume work.
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
      toast('break over · overtime is being tracked');
    }, delay);
    return () => window.clearTimeout(handle);
  }, [endsAt]);

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

  // Shared "wrap up the break" path used by both manual-end and resume-work.
  // Always flips status to Working (per v2.4.0 spec #1), clears the manual
  // flag so auto-status resumes, and cancels the timer. If `overtimeMs` is
  // provided (resume-work case), it's added to the running deficit counter.
  async function finishBreak(overtimeMs: number) {
    if (overtimeMs > 0) {
      const overtimeSec = Math.round(overtimeMs / 1000);
      await adjustDeficit(userId, overtimeSec);
      toastSuccess(`+${formatMmSs(overtimeMs)} overtime added to deficit`);
    } else {
      toastSuccess('back to working');
    }
    cancel();
    useStatusStore.getState().clearManual();
    useStatusStore.getState().setManual('working');
  }

  function handleManualEnd() {
    // Pre-zero: no overtime accrued, just flip back.
    void finishBreak(0);
  }

  function handleResume() {
    if (endsAt == null) return;
    const overtime = Math.max(0, Date.now() - endsAt);
    void finishBreak(overtime);
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
          <CountdownView
            endsAt={endsAt!}
            durationMs={durationMs}
            onManualEnd={handleManualEnd}
            onResume={handleResume}
          />
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

function formatMmSs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  endsAt, durationMs, onManualEnd, onResume,
}: {
  endsAt: number;
  durationMs: number | null;
  onManualEnd: () => void;
  onResume: () => void;
}) {
  const delta = endsAt - Date.now();
  const overtime = delta < 0;
  const abs = Math.abs(delta);
  const m = Math.floor(abs / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);

  // Pre-zero progress fills the bar over the planned duration. Once we're
  // in overtime, the bar tops out at 100% and switches color so the eye
  // catches the "you're past your break" signal even from a glance.
  const total = durationMs ?? abs;
  const elapsed = overtime
    ? total
    : Math.max(0, Math.min(total, total - delta));
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

  const headline = overtime ? 'Overtime' : 'On break';
  const sub = overtime
    ? 'Your break ended — overtime is going on the deficit until you resume.'
    : 'We’ll nudge you when it’s time to come back.';

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
            color: overtime ? 'var(--terra-deep)' : 'var(--ink)',
          }}
        >
          {headline}
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
          {sub}
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
            color: overtime ? 'var(--terra-deep)' : 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-live="polite"
        >
          {overtime ? '-' : ''}
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
              background: overtime ? 'var(--terra)' : 'var(--ochre)',
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>

      {overtime ? (
        <button
          type="button"
          onClick={onResume}
          className="ui-b wobble transition-colors"
          style={{
            border: '1.5px solid var(--terra-deep)',
            background: 'var(--terra)',
            color: 'var(--paper)',
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Resume work · log {m}:{s.toString().padStart(2, '0')} overtime
        </button>
      ) : (
        <button
          type="button"
          onClick={onManualEnd}
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
      )}
    </>
  );
}
