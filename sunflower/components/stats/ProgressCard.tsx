'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { formatDeficit } from '@/lib/compute/deficit';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PaperCard } from '@/components/ui/PaperCard';
import { todayKey } from '@/lib/time/dayKey';
import { cn } from '@/lib/utils';

interface ProgressCardProps {
  dayKey?: string;
  deficitSeconds?: number;
}

export function ProgressCard({ dayKey = todayKey(), deficitSeconds = 0 }: ProgressCardProps) {
  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter((t) => !t.archived && !t.skipped)
        .toArray(),
    [dayKey],
    [],
  );

  const { value, cap } = progressForDay(tasks ?? []);
  const doneCount = (tasks ?? []).filter((t) => t.state === 'done').length;
  const totalCount = (tasks ?? []).length;

  const estTotal = (tasks ?? []).reduce((s, t) => s + t.est_minutes, 0);
  const estDone = (tasks ?? [])
    .filter((t) => t.state === 'done')
    .reduce((s, t) => s + (t.actual_ms != null ? Math.round(t.actual_ms / 60000) : t.est_minutes), 0);

  return (
    <PaperCard variant="soft" className="px-4 py-3 col gap-2">
      <div className="row items-baseline justify-between">
        <span className="font-hand text-body-sm soft">
          today&apos;s progress · {doneCount} of {totalCount} done
        </span>
        <span className={cn('font-hand text-h3', value >= cap ? 'text-sage-deep' : 'text-ink-soft')}>
          {value}%
        </span>
      </div>

      <ProgressBar value={value} cap={cap} />

      <div className="row items-center justify-between">
        <span className="tiny">
          {estDone}m of est. {estTotal}m logged
        </span>
        {deficitSeconds > 0 && (
          <span className="tiny text-terra">{formatDeficit(deficitSeconds)} deficit</span>
        )}
      </div>
    </PaperCard>
  );
}
