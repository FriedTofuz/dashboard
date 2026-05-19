'use client';

import { useEffect } from 'react';
import { useMoveTaskStore } from '@/lib/store/useMoveTaskStore';
import { useUiStore } from '@/lib/store/useUiStore';
import { addDays, formatDayLabel, nextWeekday } from '@/lib/time/dayKey';
import { moveTaskToDay } from '@/lib/idb/tasks';
import { toast } from '@/lib/store/useToastStore';

interface DayChoice {
  label: string;
  dayKey: string;
}

export function MoveTaskDialog() {
  const open = useMoveTaskStore((s) => s.open);
  const options = useMoveTaskStore((s) => s.options);
  const close = useMoveTaskStore((s) => s.close);
  const todayKey = useUiStore((s) => s.currentDayKey);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !options) return null;

  const { monthDay: fromLabel } = formatDayLabel(options.fromDayKey);

  const choices: DayChoice[] = [
    { label: 'today',          dayKey: todayKey },
    { label: 'tomorrow',       dayKey: addDays(todayKey, 1) },
    { label: 'this/next fri',  dayKey: nextWeekday(todayKey, 5) },
    { label: 'next monday',    dayKey: nextWeekday(todayKey, 1) },
  ];

  async function pick(choice: DayChoice) {
    if (!options) return;
    const fromDayKey = options.fromDayKey;
    await moveTaskToDay(options.taskId, choice.dayKey);
    const { monthDay } = formatDayLabel(choice.dayKey);
    toast(`moved to ${monthDay}`, {
      action: {
        label: 'undo',
        onAction: () => { void moveTaskToDay(options.taskId, fromDayKey); },
      },
    });
    close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-task-title"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          gap: 14,
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <span className="tiny">carried from {fromLabel}</span>
          <h2
            id="move-task-title"
            className="hand"
            style={{ fontSize: 21, lineHeight: 1.15, fontWeight: 600, margin: 0 }}
          >
            move &ldquo;{options.taskTitle}&rdquo; to…
          </h2>
        </div>

        <div className="col" style={{ gap: 6 }}>
          {choices.map((c) => {
            const { monthDay } = formatDayLabel(c.dayKey);
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => void pick(c)}
                className="ui hover:wash-sage transition-colors row items-center justify-between"
                style={{
                  border: '1.5px solid var(--ink-soft)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  padding: '10px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <span>{c.label}</span>
                <span className="num muted" style={{ fontSize: 12 }}>{monthDay}</span>
              </button>
            );
          })}
        </div>

        <div className="row items-center justify-end" style={{ gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={close}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '8px 14px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            keep where it is
          </button>
        </div>
      </div>
    </div>
  );
}
