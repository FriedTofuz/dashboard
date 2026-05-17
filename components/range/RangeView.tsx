'use client';

import { DayColumn } from './DayColumn';
import { addDays, todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';

export function RangeView() {
  const rangeWindow = useUiStore((s) => s.rangeWindow);
  const setRangeWindow = useUiStore((s) => s.setRangeWindow);

  const n = Math.max(1, Math.min(5, rangeWindow));
  const today = todayKey();
  const half = Math.floor(n / 2);
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - half));

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="row items-center justify-between">
        <h2
          className="hand"
          style={{ fontSize: 28, lineHeight: 1, fontWeight: 600, margin: 0 }}
        >
          <span className="underline-hand">range view</span>
        </h2>
        <div className="row items-center" style={{ gap: 6 }}>
          <span className="tiny" style={{ marginRight: 6 }}>window</span>
          {[1, 3, 5].map((w) => {
            const active = w === n;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setRangeWindow(w)}
                className="wobble transition-colors hover:bg-paper-warm"
                style={{
                  border: active
                    ? '1.5px solid var(--terra-deep)'
                    : '1.5px solid var(--ink-soft)',
                  background: active ? 'var(--terra)' : 'var(--paper)',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                  borderRadius: 5,
                  padding: '6px 12px',
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {w} day
              </button>
            );
          })}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">
          <span className="headline">fresh week</span>
          <span className="sub">your past 5 days will show up here</span>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            gap: 16,
          }}
        >
          {days.map((d) => (
            <DayColumn key={d} dayKey={d} />
          ))}
        </div>
      )}
    </div>
  );
}
