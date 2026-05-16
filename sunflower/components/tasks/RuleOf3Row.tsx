'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { RuleOf3Slot } from './RuleOf3Slot';
import { todayKey } from '@/lib/time/dayKey';

interface RuleOf3RowProps {
  dayKey?: string;
}

export function RuleOf3Row({ dayKey = todayKey() }: RuleOf3RowProps) {
  const r3Tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter((t) => t.r3_slot != null && !t.archived)
        .toArray(),
    [dayKey],
    [],
  );

  const bySlot = (slot: 1 | 2 | 3) => r3Tasks?.find((t) => t.r3_slot === slot);

  return (
    <div className="col gap-2">
      <p className="tiny text-sage-deep">
        rule of 3 — the three things that would make today a win
      </p>
      <div className="flex gap-3">
        <RuleOf3Slot slot={1} task={bySlot(1)} dayKey={dayKey} />
        <RuleOf3Slot slot={2} task={bySlot(2)} dayKey={dayKey} />
        <RuleOf3Slot slot={3} task={bySlot(3)} dayKey={dayKey} />
      </div>
    </div>
  );
}
