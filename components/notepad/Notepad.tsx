'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { setDayNotes } from '@/lib/idb/days';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

interface NotepadProps {
  dayKey: string;
  userId: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Notepad({ dayKey, userId, className, style }: NotepadProps) {
  const day = useLiveQuery(() => getDb().days.get([userId, dayKey]), [userId, dayKey]);
  const remoteValue = day?.notes ?? '';
  const openArchive = useUiStore((s) => s.setNotepadArchiveOpen);

  const [local, setLocal] = useState(remoteValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setLocal(remoteValue);
  }, [remoteValue]);

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

  return (
    <div
      className={cn('paper relative wobble', className)}
      style={{
        border: '1.5px solid var(--ink-soft)',
        borderRadius: 6,
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)',
        minHeight: 280,
        flex: 1,
        ...style,
      }}
    >
      {/* terracotta margin line at 0.45 opacity */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 12,
          bottom: 12,
          left: 56,
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
          left: 70,
          right: 18,
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
            pointerEvents: 'none',
          }}
        >
          Scratch notes
        </span>
        <button
          type="button"
          onClick={() => openArchive(true)}
          className="ui hover:bg-paper-warm transition-colors no-print"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            padding: '2px 6px',
            borderRadius: 3,
            cursor: 'pointer',
            fontWeight: 500,
          }}
          aria-label="Archive scratch notes"
        >
          archive…
        </button>
      </div>

      <textarea
        value={local}
        onChange={handleChange}
        placeholder="scratch notes…"
        className={cn(
          'hand bg-transparent w-full h-full resize-none border-none outline-none',
          'placeholder:text-ink-faint',
        )}
        style={{
          padding: '40px 18px 16px 70px',
          lineHeight: '32px',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--ink-soft)',
          minHeight: 280,
        }}
        aria-label={`Scratch notepad for ${dayKey}`}
      />
    </div>
  );
}
