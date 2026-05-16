'use client';

import { DayColumn } from './DayColumn';
import { addDays, todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';

export function RangeView() {
  const rangeWindow = useUiStore((s) => s.rangeWindow);
  const setRangeWindow = useUiStore((s) => s.setRangeWindow);

  // Window: today centered with half before and after, clamped to 1..5
  const n = Math.max(1, Math.min(5, rangeWindow));
  const today = todayKey();
  const half = Math.floor(n / 2);
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - half));

  return (
    <div className="col gap-3">
      <div className="row items-center justify-between">
        <h2 className="font-hand text-h2">
          <span className="underline-hand">range view</span>
        </h2>
        <div className="row gap-1">
          <span className="tiny mr-1">window</span>
          {[1, 3, 5].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setRangeWindow(w)}
              className={`font-hand text-body-sm px-3 py-1 rounded-card transition-colors ${
                w === n ? 'wash-terra ink-box-terra' : 'ink-box-soft hover:wash-sage'
              }`}
            >
              {w} day
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {days.map((d) => (
          <DayColumn key={d} dayKey={d} />
        ))}
      </div>
    </div>
  );
}
