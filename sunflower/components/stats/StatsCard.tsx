'use client';

import { PaperCard } from '@/components/ui/PaperCard';
import { formatDeficit } from '@/lib/compute/deficit';
import { cn } from '@/lib/utils';

interface StatChip {
  label: string;
  value: string;
  accent?: 'sage' | 'terra' | 'ink';
}

interface StatsCardProps {
  todayPct: number;
  weekAvgPct?: number;
  deficitSeconds: number;
  streakDays?: boolean[];  // last 14 days, true = streak day
}

export function StatsCard({
  todayPct,
  weekAvgPct = 0,
  deficitSeconds,
  streakDays = [],
}: StatsCardProps) {
  const chips: StatChip[] = [
    { label: 'today',     value: `${todayPct}%`,                  accent: 'ink' },
    { label: 'week avg',  value: `${weekAvgPct}%`,                accent: 'sage' },
    { label: 'time deficit', value: formatDeficit(deficitSeconds), accent: deficitSeconds > 0 ? 'terra' : 'sage' },
  ];

  return (
    <PaperCard variant="soft" className="px-4 py-3 col gap-3">
      {/* Stat chips */}
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

      {/* Streak squares — last 14 days */}
      <div className="col gap-1">
        <div className="row items-center gap-2">
          <span className="tiny">streak</span>
          <div className="flex flex-wrap gap-1 flex-1">
            {Array.from({ length: 14 }, (_, i) => {
              const day = streakDays[i];
              return (
                <div
                  key={i}
                  className="wobble"
                  style={{
                    width: 12,
                    height: 12,
                    background: 'var(--sage)',
                    borderRadius: 2,
                    opacity: day ? 0.7 : 0.15,
                  }}
                />
              );
            })}
          </div>
          {streakDays.filter(Boolean).length > 0 && (
            <span className="font-hand text-body-sm text-sage-deep">
              {streakDays.filter(Boolean).length} days
            </span>
          )}
        </div>
      </div>
    </PaperCard>
  );
}
