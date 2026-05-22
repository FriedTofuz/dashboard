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

/** Lerp from red (0%) → yellow (50%) → green (100%). Returns an rgb string. */
function gradientColor(pct: number, hasContent: boolean, logged: boolean): string {
  if (!hasContent || !logged) {
    // Empty / habit-only day OR unlogged day — neutral wash, no opinion.
    // Logging is opt-in so stats only reflect days the user explicitly
    // confirms; otherwise an offline day would read as 0%.
    return 'rgba(180, 170, 158, 0.18)';
  }
  const p = Math.max(0, Math.min(100, pct));
  // Stops: red #cf4f3a, yellow #e8b048, green #6b8a5c
  const red = [207, 79, 58];
  const yellow = [232, 176, 72];
  const green = [107, 138, 92];
  let from: number[];
  let to: number[];
  let t: number;
  if (p <= 50) {
    from = red;
    to = yellow;
    t = p / 50;
  } else {
    from = yellow;
    to = green;
    t = (p - 50) / 50;
  }
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function gradientBorder(pct: number, hasContent: boolean, logged: boolean): string {
  if (!hasContent || !logged) return '1px solid var(--ink-faint)';
  return `1px solid ${gradientColor(pct, true, true)}`;
}

export function StatsCard({ userId, dayKey, deficitSeconds, mobile = false }: StatsCardProps) {
  const { todayPct, weekAvgPct, streakHeat, streakLen, heatmap } = useStats(dayKey);

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

  // Desktop: 14 most-recent days, chronological (oldest left → today right).
  // Mobile: 30 most-recent days in a 15×2 grid, also chronological.
  const desktopSquares = streakHeat.slice().reverse();
  const mobileSquares = heatmap.slice(-30).reverse();

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

        {/* Streak row — red→yellow→green per per-day completion %. */}
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
              {mobileSquares.map((d, i) => (
                <div
                  key={i}
                  className="wobble"
                  title={
                    !d.hasContent
                      ? `${d.day} · no tasks`
                      : !d.logged
                        ? `${d.day} · unlogged`
                        : `${d.day} · ${d.pct}%`
                  }
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 2,
                    border: gradientBorder(d.pct, d.hasContent, d.logged),
                    background: gradientColor(d.pct, d.hasContent, d.logged),
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="row" style={{ gap: 4, flex: 1 }}>
              {desktopSquares.map((d, i) => (
                <div
                  key={i}
                  className="wobble"
                  title={
                    !d.hasContent
                      ? `${d.day} · no tasks`
                      : !d.logged
                        ? `${d.day} · unlogged`
                        : `${d.day} · ${d.pct}%`
                  }
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 2,
                    border: gradientBorder(d.pct, d.hasContent, d.logged),
                    background: gradientColor(d.pct, d.hasContent, d.logged),
                  }}
                />
              ))}
            </div>
          )}
          {streakLen > 0 && (
            <span
              className="ui-b num"
              style={{ color: 'var(--sage-deep)', fontSize: 14 }}
            >
              {streakLen} days
            </span>
          )}
        </div>
      </div>
    </PaperCard>
  );
}
