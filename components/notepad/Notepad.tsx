'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { setDayNotes } from '@/lib/idb/days';
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
      className={cn(
        'paper ink-box-soft ruled-dense ruled-margin relative flex-1 min-h-0',
        className,
      )}
      style={style ?? { minHeight: 200 }}
    >
      <textarea
        value={local}
        onChange={handleChange}
        placeholder="scratch notes…"
        className={cn(
          'font-hand text-body bg-transparent w-full h-full resize-none border-none outline-none',
          'placeholder:text-ink-faint',
        )}
        style={{ padding: '14px 18px 14px 70px', lineHeight: '32px' }}
        aria-label={`Scratch notepad for ${dayKey}`}
      />
    </div>
  );
}
