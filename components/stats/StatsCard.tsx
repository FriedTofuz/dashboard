'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { PaperCard } from '@/components/ui/PaperCard';
import { formatDeficit } from '@/lib/compute/deficit';
import { heatColor as gradientColor, heatBorder as gradientBorder } from '@/lib/compute/dayHeat';
import { useStats } from '@/lib/hooks/useStats';
import { getDb } from '@/lib/idb/db';
import { useAccentStore } from '@/lib/store/useAccentStore';

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
  /** When true, sage/terra accents both resolve to Berkeley blue (#002676)
   *  so all colored stat numbers share a single hue. */
  berkeley?: boolean;
}

function StatChip({ label, value, accent, berkeley = false }: StatChipProps) {
  const color =
    accent === 'ink'
      ? 'var(--ink)'
      : berkeley
        ? 'var(--terra-deep)' // = #002676 under Berkeley accent
        : accent === 'sage'
          ? 'var(--sage-deep)'
          : 'var(--terra-deep)';
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
  const { todayPct, weekAvgPct, streakHeat, streakLen, heatmap } = useStats(dayKey);
  const berkeley = useAccentStore((s) => s.accent === 'berkeley');

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
          <StatChip label="Today" value={`${todayPct}%`} accent="ink" berkeley={berkeley} />
          <StatChip label="Week avg" value={`${weekAvgPct}%`} accent="sage" berkeley={berkeley} />
          <StatChip
            label="Time deficit"
            value={formatDeficit(deficitSeconds)}
            accent={deficitSeconds > 0 ? 'terra' : 'sage'}
            berkeley={berkeley}
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
                    border: gradientBorder(d.pct, d.hasContent, d.logged, berkeley),
                    background: gradientColor(d.pct, d.hasContent, d.logged, berkeley),
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
                    border: gradientBorder(d.pct, d.hasContent, d.logged, berkeley),
                    background: gradientColor(d.pct, d.hasContent, d.logged, berkeley),
                  }}
                />
              ))}
            </div>
          )}
          {streakLen > 0 && (
            <span
              className="ui-b num"
              style={{
                // Under Berkeley, all stat colors collapse to Berkeley blue
                // (= --terra-deep) so the streak count matches the chips.
                color: berkeley ? 'var(--terra-deep)' : 'var(--sage-deep)',
                fontSize: 14,
              }}
            >
              {streakLen} days
            </span>
          )}
        </div>
      </div>
    </PaperCard>
  );
}
