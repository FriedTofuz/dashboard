'use client';

import { formatDayLabel, addDays, todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

function shortWeekday(full: string): string {
  const s = full.slice(0, 3);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TopBar() {
  const { currentDayKey, setCurrentDayKey } = useUiStore();
  const today = todayKey();
  const { weekday, monthDay } = formatDayLabel(currentDayKey);

  const days = [-2, -1, 0, 1, 2].map((offset) => addDays(today, offset));

  return (
    <div className="row items-start justify-between mb-1 gap-6 flex-wrap">
      {/* Date display — 52px Caveat with terra wobble underline */}
      <div className="col gap-1.5">
        <span className="tiny">{weekday}</span>
        <h1
          className="font-hand v2-date-display"
          style={{
            fontSize: 52,
            lineHeight: 1,
            fontWeight: 700,
            position: 'relative',
            display: 'inline-block',
            paddingBottom: 6,
          }}
        >
          <span className="underline-hand">{monthDay}</span>
        </h1>
      </div>

      {/* Day range pills */}
      <div className="row items-center gap-2.5 no-print">
        <span className="hand" style={{ fontSize: 17, color: 'var(--ink-faint)' }}>
          ← today
        </span>
        <div className="row gap-1.5">
          {days.map((key) => {
            const isToday = key === today;
            const isSelected = key === currentDayKey;
            const [, , d] = key.split('-');
            const { weekday: w } = formatDayLabel(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrentDayKey(key)}
                aria-current={isSelected ? 'date' : undefined}
                className={cn(
                  'wobble transition-colors',
                  isToday
                    ? 'date-pill-today'
                    : 'date-pill',
                  isSelected && !isToday && 'wash-sage',
                )}
                style={{
                  border: isToday
                    ? '1.5px solid var(--terra-deep)'
                    : '1.5px solid var(--ink)',
                  background: isToday ? 'var(--terra)' : 'transparent',
                  color: isToday ? 'var(--paper)' : 'var(--ink)',
                  borderRadius: 4,
                  padding: '4px 10px 3px',
                  minWidth: 50,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="tiny"
                  style={{
                    color: isToday ? 'var(--paper)' : 'var(--ink-faint)',
                    opacity: isToday ? 0.9 : 1,
                    display: 'block',
                  }}
                >
                  {shortWeekday(w)}
                </span>
                <span
                  className="ui-b num"
                  style={{ fontSize: 18, lineHeight: 1.2, display: 'block' }}
                >
                  {d}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
