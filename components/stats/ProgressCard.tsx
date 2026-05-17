'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { progressForDay } from '@/lib/compute/progress';
import { formatDeficit } from '@/lib/compute/deficit';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PaperCard } from '@/components/ui/PaperCard';
import { todayKey } from '@/lib/time/dayKey';

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

  const overGoal = value > 100;

  return (
    <PaperCard variant="soft" style={{ padding: '18px 24px' }}>
      <div className="row items-baseline justify-between" style={{ marginBottom: 10 }}>
        <span
          className="ui"
          style={{ fontSize: 14, color: 'var(--ink-soft)', letterSpacing: '0.02em' }}
        >
          today&apos;s progress · {doneCount} of {totalCount} done
        </span>
        <span
          className="ui-b num"
          style={{
            fontSize: 22,
            color: overGoal ? 'var(--ochre-deep)' : 'var(--sage-deep)',
            lineHeight: 1,
          }}
        >
          {value}%
        </span>
      </div>

      <ProgressBar value={value} cap={cap} overGoal={overGoal} />

      <div className="row items-center justify-between" style={{ marginTop: 8 }}>
        <span className="tiny num">
          {estDone}m of est. {estTotal}m logged
        </span>
        {deficitSeconds > 0 && (
          <span className="tiny num" style={{ color: 'var(--terra-deep)' }}>
            {formatDeficit(deficitSeconds)} deficit
          </span>
        )}
      </div>
    </PaperCard>
  );
}
