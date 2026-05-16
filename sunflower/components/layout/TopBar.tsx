'use client';

import { formatDayLabel, addDays, todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { currentDayKey, setCurrentDayKey } = useUiStore();
  const today = todayKey();
  const { weekday, monthDay } = formatDayLabel(currentDayKey);

  // Build a -2..+2 day window around today
  const days = [-2, -1, 0, 1, 2].map((offset) => addDays(today, offset));

  return (
    <div className="row items-end justify-between mb-5">
      {/* Date display */}
      <div className="col gap-0">
        <span className="tiny">{weekday}</span>
        <h1 className="font-hand text-display leading-none">
          <span className="underline-hand">{monthDay}</span>
        </h1>
      </div>

      {/* Day range pills */}
      <div className="row items-center gap-1.5">
        <span className="annot text-sm mr-1">← today</span>
        <div className="row gap-1">
          {days.map((key) => {
            const isToday = key === today;
            const isSelected = key === currentDayKey;
            const [, , d] = key.split('-');
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrentDayKey(key)}
                className={cn(
                  'font-hand text-body-sm px-3 py-1 rounded-card transition-colors',
                  isSelected
                    ? 'wash-terra ink-box-terra'
                    : 'ink-box-soft hover:wash-sage',
                  isToday && !isSelected && 'text-terra',
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
        <span className="tiny ml-2 muted">drag edges to widen window</span>
      </div>
    </div>
  );
}
