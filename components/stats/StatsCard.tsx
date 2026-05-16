'use client';

import { PaperCard } from '@/components/ui/PaperCard';
import { formatDeficit } from '@/lib/compute/deficit';
import { useStats } from '@/lib/hooks/useStats';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  userId: string;
  dayKey: string;
  deficitSeconds: number;
}

export function StatsCard({ dayKey, deficitSeconds }: StatsCardProps) {
  const { todayPct, weekAvgPct, streakDays, heatmap } = useStats(dayKey);
  const streakLen = streakDays.filter(Boolean).length;

  const chips = [
    { label: 'today', value: `${todayPct}%`, accent: 'ink' as const },
    { label: 'week avg', value: `${weekAvgPct}%`, accent: 'sage' as const },
    {
      label: 'time deficit',
      value: formatDeficit(deficitSeconds),
      accent: deficitSeconds > 0 ? ('terra' as const) : ('sage' as const),
    },
  ];

  return (
    <PaperCard variant="soft" className="px-4 py-3 col gap-3">
      <div className="row gap-4">
        {chips.map((c) => (
          <div key={c.label} className="col gap-0.5 flex-1">
            <span className="tiny">{c.label}</span>
            <span
              className={cn(
                'font-hand text-h3',
                c.accent === 'sage' && 'text-sage-deep',
                c.accent === 'terra' && 'text-terra-deep',
              )}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>

      <div className="row items-center gap-2">
        <span className="tiny w-12 shrink-0">streak</span>
        <div className="flex flex-wrap gap-1 flex-1">
          {streakDays.map((day, i) => (
            <div
              key={i}
              className="wobble"
              style={{
                width: 12,
                height: 12,
                background: 'var(--sage)',
                borderRadius: 2,
                opacity: day ? 0.75 : 0.15,
              }}
              aria-label={day ? 'day complete' : 'incomplete'}
            />
          ))}
        </div>
        {streakLen > 0 && (
          <span className="font-hand text-body-sm text-sage-deep">{streakLen}d</span>
        )}
      </div>

      <div className="row items-center gap-2">
        <span className="tiny w-12 shrink-0">30d</span>
        <div className="flex flex-wrap gap-[3px] flex-1">
          {heatmap
            .slice()
            .reverse()
            .map((d) => {
              const intensity = Math.min(1, d.pct / 100);
              return (
                <div
                  key={d.day}
                  className="wobble"
                  title={`${d.day} · ${d.pct}%`}
                  style={{
                    width: 9,
                    height: 9,
                    background: 'var(--sage)',
                    borderRadius: 2,
                    opacity: 0.1 + intensity * 0.75,
                  }}
                />
              );
            })}
        </div>
      </div>
    </PaperCard>
  );
}
