'use client';

import { PaperCard } from '@/components/ui/PaperCard';
import { useStats } from '@/lib/hooks/useStats';
import { useLongTermStats } from '@/lib/hooks/useLongTermStats';
import { todayKey } from '@/lib/time/dayKey';

interface Props {
  userId: string;
  /** Anchor day for the averages. Defaults to today. */
  dayKey?: string;
}

/** Week / Month / Year / All-time average completion %. Surfaced on the
 *  range view; intentionally absent from the main day view to keep that
 *  surface focused on today. */
export function LongTermStatsPanel({ userId, dayKey = todayKey() }: Props) {
  const { weekAvgPct } = useStats(dayKey);
  const { monthAvgPct, yearAvgPct, allTimeAvgPct, daysLogged } =
    useLongTermStats(userId, dayKey);

  return (
    <PaperCard variant="soft" style={{ padding: '18px 24px' }}>
      <div className="col" style={{ gap: 8 }}>
        <p className="section-head muted">Averages</p>
        <div
          className="row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 16,
            alignItems: 'baseline',
          }}
        >
          <Stat label="Week" value={`${weekAvgPct}%`} accent="sage" />
          <Stat label="Month" value={`${monthAvgPct}%`} accent="ink" />
          <Stat label="Year" value={`${yearAvgPct}%`} accent="ink" />
          <Stat
            label="All time"
            value={`${allTimeAvgPct}%`}
            accent="ink"
            sub={`${daysLogged} day${daysLogged === 1 ? '' : 's'}`}
          />
        </div>
      </div>
    </PaperCard>
  );
}

function Stat({
  label, value, accent, sub,
}: {
  label: string;
  value: string;
  accent: 'ink' | 'sage';
  sub?: string;
}) {
  const color = accent === 'sage' ? 'var(--sage-deep)' : 'var(--ink)';
  return (
    <div className="col" style={{ gap: 4 }}>
      <span className="tiny" style={{ letterSpacing: '0.14em' }}>{label}</span>
      <span
        className="ui-b num"
        style={{
          fontSize: 24,
          lineHeight: 1,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="ui num"
          style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
