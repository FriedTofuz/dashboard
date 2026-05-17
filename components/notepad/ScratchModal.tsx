'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { setDayNotes } from '@/lib/idb/days';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

interface ScratchModalProps {
  dayKey: string;
  userId: string;
}

export function ScratchModal({ dayKey, userId }: ScratchModalProps) {
  const open = useUiStore((s) => s.scratchOpen);
  const setOpen = useUiStore((s) => s.setScratchOpen);
  const openArchive = useUiStore((s) => s.setNotepadArchiveOpen);

  const day = useLiveQuery(
    () => getDb().days.get([userId, dayKey]),
    [userId, dayKey],
  );
  const remoteValue = day?.notes ?? '';

  const [local, setLocal] = useState(remoteValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setLocal(remoteValue);
  }, [remoteValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  // Flush any pending save when closing.
  useEffect(() => {
    if (open) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        void setDayNotes(userId, dayKey, local);
        dirtyRef.current = false;
      }
    }
  }, [open, userId, dayKey, local]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setLocal(v);
    dirtyRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void setDayNotes(userId, dayKey, v);
      dirtyRef.current = false;
    }, 800);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Scratch notes"
    >
      <div
        className="paper relative wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          width: 'min(960px, 92vw)',
          height: 'min(720px, 88vh)',
          background: 'var(--paper)',
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        {/* terracotta margin line */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            bottom: 12,
            left: 84,
            width: 1,
            background: 'rgba(184, 92, 62, 0.45)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="row items-center justify-between"
          style={{
            position: 'absolute',
            top: 16,
            left: 100,
            right: 22,
            zIndex: 1,
          }}
        >
          <span
            className="ui-b"
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}
          >
            Scratch notes
          </span>
          <div className="row items-center" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={() => openArchive(true)}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
                padding: '2px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
              }}
              aria-label="Open scratch archive"
            >
              archive…
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                background: 'transparent',
                border: '1.5px solid var(--ink-soft)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--ink)',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
              }}
              aria-label="Close scratch"
            >
              close
            </button>
          </div>
        </div>

        <textarea
          value={local}
          onChange={handleChange}
          placeholder="scratch notes…"
          autoFocus
          className={cn(
            'hand bg-transparent w-full h-full resize-none border-none outline-none',
            'placeholder:text-ink-faint',
          )}
          style={{
            padding: '46px 24px 20px 100px',
            lineHeight: '32px',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink-soft)',
          }}
          aria-label={`Scratch notepad for ${dayKey}`}
        />
      </div>
    </div>
  );
}
