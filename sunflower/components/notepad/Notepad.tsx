'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NotepadProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Notepad({ value, onChange, className, style }: NotepadProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timerRef.current);
    // Debounce: persist after 800 ms idle
    timerRef.current = setTimeout(() => onChange(v), 800);
  }

  return (
    <div
      className={cn(
        'paper ink-box-soft ruled-dense ruled-margin relative flex-1 min-h-0',
        className,
      )}
      style={style}
    >
      <textarea
        value={local}
        onChange={handleChange}
        placeholder="scratch notes…"
        className={cn(
          'font-hand text-body bg-transparent w-full h-full resize-none border-none outline-none',
          'placeholder:text-ink-faint',
        )}
        style={{
          padding: '14px 18px 14px 70px',
          lineHeight: '32px',
        }}
        aria-label="Scratch notepad"
      />
    </div>
  );
}
