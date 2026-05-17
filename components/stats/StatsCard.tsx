'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { PaperCard } from '@/components/ui/PaperCard';
import { formatDeficit } from '@/lib/compute/deficit';
import { useStats } from '@/lib/hooks/useStats';
import { getDb } from '@/lib/idb/db';

interface StatsCardProps {
  userId: string;
  dayKey: string;
  deficitSeconds: number;
  /** Force the mobile 15×2 streak grid even on desktop. */
  mobile?: boolean;
}

interface StatChipProps {
  label: string;
  value: string;
  accent: 'ink' | 'sage' | 'terra';
}

function StatChip({ label, value, accent }: StatChipProps) {
  const color =
    accent === 'sage'
      ? 'var(--sage-deep)'
      : accent === 'terra'
        ? 'var(--terra-deep)'
        : 'var(--ink)';
  return (
    <div className="col" style={{ gap: 6 }}>
      <span className="tiny" style={{ letterSpacing: '0.14em' }}>{label}</span>
      <span
        className="ui-b num"
        style={{
          fontSize: 28,
          lineHeight: 1,
          color,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function StatsCard({ userId, dayKey, deficitSeconds, mobile = false }: StatsCardProps) {
  const { todayPct, weekAvgPct, streakDays, heatmap } = useStats(dayKey);
  const streakLen = streakDays.filter(Boolean).length;

  const distinctDays = useLiveQuery(
    () => getDb().days.where('user_id').equals(userId).count(),
    [userId],
    0,
  );

  // §8 — Stats first day: show empty state until 2+ days of data
  if ((distinctDays ?? 0) < 2 && todayPct === 0 && weekAvgPct === 0) {
    return (
      <div className="empty-state">
        <span className="headline">come back tomorrow</span>
        <span className="sub">stats need 2 days of data to mean anything</span>
      </div>
    );
  }

  // Build the streak squares. On desktop: up to 14, single row, ochre-gradient
  // tied to completion intensity. On mobile (§9): 30 squares in 15×2 grid.
  const streakDesktopCount = 14;
  const streakSquares = mobile
    ? heatmap.slice(-30)
    : streakDays.slice(-streakDesktopCount).map((done) => ({
        day: '',
        pct: done ? 95 : 25,
      }));

  return (
    <PaperCard variant="soft" style={{ padding: '20px 24px' }}>
      <div className="col" style={{ gap: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 24,
          }}
        >
          <StatChip label="Today" value={`${todayPct}%`} accent="ink" />
          <StatChip label="Week avg" value={`${weekAvgPct}%`} accent="sage" />
          <StatChip
            label="Time deficit"
            value={formatDeficit(deficitSeconds)}
            accent={deficitSeconds > 0 ? 'terra' : 'sage'}
          />
        </div>

        {/* Streak row — ochre tint per §3, 16×16 desktop, 15×2 mobile per §9 */}
        <div
          className="row items-center"
          style={{
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--rule)',
          }}
        >
          <span
            className="tiny"
            style={{ width: 56, flexShrink: 0, letterSpacing: '0.14em' }}
          >
            Streak
          </span>
          {mobile ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(15, 1fr)',
                gap: 3,
                flex: 1,
              }}
            >
              {streakSquares.map((d, i) => {
                const intensity = Math.min(1, d.pct / 100);
                const alpha = (0.2 + intensity * 0.8).toFixed(2);
                return (
                  <div
                    key={i}
                    className="wobble"
                    title={d.day ? `${d.day} · ${d.pct}%` : undefined}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 2,
                      border: '1px solid var(--ochre-deep)',
                      background: `rgba(201, 138, 46, ${alpha})`,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="row" style={{ gap: 4, flex: 1 }}>
              {streakSquares.map((d, i) => {
                const intensity = Math.min(1, d.pct / 100);
                const alpha = (0.2 + intensity * 0.8).toFixed(2);
                return (
                  <div
                    key={i}
                    className="wobble"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      border: '1px solid var(--ochre-deep)',
                      background: `rgba(201, 138, 46, ${alpha})`,
                    }}
                    aria-hidden
                  />
                );
              })}
            </div>
          )}
          {streakLen > 0 && (
            <span
              className="ui-b num"
              style={{ color: 'var(--ochre-deep)', fontSize: 14 }}
            >
              {streakLen} days
            </span>
          )}
        </div>
      </div>
    </PaperCard>
  );
}
