'use client';

import { useEffect, useRef, useState } from 'react';
import { useBreakTimerStore } from '@/lib/store/useBreakTimerStore';
import { useStatusStore, type CurrentStatus } from '@/lib/store/useStatusStore';
import { useThemeStore } from '@/lib/store/useThemeStore';
import { setDayAway } from '@/lib/idb/days';
import { todayKey } from '@/lib/time/dayKey';
import { toast } from '@/lib/store/useToastStore';

interface StatusMenuProps {
  userId: string;
}

interface StatusDef {
  id: CurrentStatus;
  label: string;
  description: string;
  /** Dot color — uses CSS vars so themes/accents pick up automatically. */
  dot: string;
}

/** Menu order is locked per the v2.2 spec: Working → Breaking → Resting → Away. */
const STATUSES: StatusDef[] = [
  {
    id: 'working',
    label: 'Working',
    description: 'On a task',
    dot: 'var(--sage-deep)',
  },
  {
    id: 'breaking',
    label: 'Breaking',
    description: 'Short break',
    dot: 'var(--ochre)',
  },
  {
    id: 'resting',
    label: 'Resting',
    description: 'Sleep / nap / eat · enables dark mode',
    dot: '#5A6B8C',
  },
  {
    id: 'away',
    label: 'Away',
    description: 'Out of office · today logged as rest day',
    dot: 'var(--terra-deep)',
  },
];

function statusDef(id: CurrentStatus): StatusDef {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}

export function StatusMenu({ userId }: StatusMenuProps) {
  const status = useStatusStore((s) => s.status);
  const setManual = useStatusStore((s) => s.setManual);
  const setMode = useThemeStore((s) => s.setMode);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Live countdown ticker for the break label. Re-renders the pill every
  // second while a break is active so the user sees the remaining time
  // shrink in place.
  const endsAt = useBreakTimerStore((s) => s.endsAt);
  const [, force] = useState(0);
  useEffect(() => {
    if (endsAt == null) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function pick(id: CurrentStatus) {
    setOpen(false);
    const prev = status;
    setManual(id);

    if (id === 'resting') {
      setMode('dark');
    }

    // Away ⇔ today.away. Symmetric: switching off Away unmarks today.
    if (id === 'away') {
      await setDayAway(userId, todayKey(), true);
      toast('today logged as a rest day');
    } else if (prev === 'away') {
      await setDayAway(userId, todayKey(), false);
    }
  }

  const current = statusDef(status);

  // Active break: append a "· m:ss" countdown to the Breaking label.
  let label = current.label;
  if (status === 'breaking' && endsAt != null) {
    const remaining = Math.max(0, endsAt - Date.now());
    const m = Math.floor(remaining / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    label = `Breaking · ${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="wobble transition-colors hover:bg-paper-warm"
        style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--ink)',
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 999,
          padding: '5px 12px 5px 10px',
          background: 'var(--paper)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 30,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: current.dot,
            flexShrink: 0,
          }}
        />
        <span>{label}</span>
        <span
          aria-hidden
          style={{
            fontSize: 10,
            color: 'var(--ink-faint)',
            marginLeft: 2,
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="wobble"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 40,
            minWidth: 240,
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)',
            padding: 6,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          }}
        >
          {STATUSES.map((s) => {
            const active = s.id === status;
            return (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => void pick(s.id)}
                className="hover:bg-paper-warm transition-colors"
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: s.dot,
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <span className="col" style={{ flex: 1, gap: 0 }}>
                  <span
                    className="ui-b"
                    style={{ fontSize: 13, color: 'var(--ink)' }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="ui"
                    style={{ fontSize: 11, color: 'var(--ink-faint)' }}
                  >
                    {s.description}
                  </span>
                </span>
                {active && (
                  <span
                    aria-hidden
                    style={{
                      color: 'var(--ink-faint)',
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
