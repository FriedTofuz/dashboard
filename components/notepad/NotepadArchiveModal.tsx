'use client';

import { useEffect, useState } from 'react';
import { archiveNotepadRange } from '@/lib/idb/notepad';
import { useUiStore } from '@/lib/store/useUiStore';
import { todayKey, addDays, toDayKey, fromDayKey } from '@/lib/time/dayKey';

interface Props {
  userId: string;
}

function dayKeyToInputValue(key: string): string {
  return key;
}

function inputValueToDayKey(value: string): string | null {
  // <input type="date"> already produces YYYY-MM-DD when valid
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export function NotepadArchiveModal({ userId }: Props) {
  const open = useUiStore((s) => s.notepadArchiveOpen);
  const setOpen = useUiStore((s) => s.setNotepadArchiveOpen);

  const today = todayKey();
  const sevenDaysAgo = addDays(today, -6);

  const [fromKey, setFromKey] = useState<string>(sevenDaysAgo);
  const [toKey, setToKey] = useState<string>(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFromKey(sevenDaysAgo);
      setToKey(today);
      setError(null);
      setSuccess(null);
      setBusy(false);
    }
  }, [open, sevenDaysAgo, today]);

  if (!open) return null;

  async function handleArchive() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const id = await archiveNotepadRange(userId, fromKey, toKey);
      if (!id) {
        setError('no notes in that range yet — nothing to archive.');
      } else {
        const fromLabel = fromDayKey(fromKey).toLocaleDateString();
        const toLabel = fromDayKey(toKey).toLocaleDateString();
        setSuccess(
          fromKey === toKey
            ? `archived ${fromLabel} → find it in archive`
            : `archived ${fromLabel}–${toLabel} → find it in archive`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to archive');
    } finally {
      setBusy(false);
    }
  }

  function setPreset(daysBack: number) {
    const from = addDays(today, -daysBack);
    setFromKey(from);
    setToKey(today);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          padding: 24,
          width: '100%',
          maxWidth: 460,
          gap: 16,
          background: 'var(--paper)',
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <span className="tiny">archive notepad</span>
          <h2
            className="hand"
            style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 700, margin: 0 }}
          >
            save & clear scratch notes
          </h2>
          <p className="ui" style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>
            bundles every day&apos;s notes in the range into one searchable
            archive page, then clears each day&apos;s scratch paper.
          </p>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'today',     days: 0  },
            { label: 'last 7d',   days: 6  },
            { label: 'last 30d',  days: 29 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(p.days)}
              className="ui wobble hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--ink-soft)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                padding: '6px 12px',
                borderRadius: 5,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <label className="tiny" htmlFor="np-archive-from">from</label>
            <input
              id="np-archive-from"
              type="date"
              value={dayKeyToInputValue(fromKey)}
              max={toKey}
              onChange={(e) => {
                const v = inputValueToDayKey(e.target.value);
                if (v) setFromKey(v);
              }}
              className="ui wobble num"
              style={{
                border: '1.5px solid var(--ink-soft)',
                borderRadius: 5,
                padding: '8px 10px',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <span className="ui" style={{ paddingBottom: 10, color: 'var(--ink-faint)' }}>→</span>
          <div className="col" style={{ gap: 4, flex: 1, minWidth: 140 }}>
            <label className="tiny" htmlFor="np-archive-to">to</label>
            <input
              id="np-archive-to"
              type="date"
              value={dayKeyToInputValue(toKey)}
              min={fromKey}
              max={toDayKey(new Date())}
              onChange={(e) => {
                const v = inputValueToDayKey(e.target.value);
                if (v) setToKey(v);
              }}
              className="ui wobble num"
              style={{
                border: '1.5px solid var(--ink-soft)',
                borderRadius: 5,
                padding: '8px 10px',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {error && (
          <p className="hand" style={{ color: 'var(--terra-deep)', fontSize: 16, margin: 0 }}>
            {error}
          </p>
        )}
        {success && (
          <p className="hand" style={{ color: 'var(--sage-deep)', fontSize: 16, margin: 0 }}>
            ✓ {success}
          </p>
        )}

        <div className="row items-center justify-between" style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              padding: '8px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            close
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={busy}
            className="ui-b wobble hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage-deep)',
              color: 'var(--paper)',
              padding: '8px 14px',
              borderRadius: 5,
              cursor: busy ? 'wait' : 'pointer',
              fontSize: 13,
            }}
          >
            {busy ? 'archiving…' : 'archive & clear'}
          </button>
        </div>
      </div>
    </div>
  );
}
