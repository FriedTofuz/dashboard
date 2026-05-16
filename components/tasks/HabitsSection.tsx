'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb } from '@/lib/idb/db';
import { TaskRow } from './TaskRow';

interface HabitsSectionProps {
  dayKey: string;
}

export function HabitsSection({ dayKey }: HabitsSectionProps) {
  const habits = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter((t) => !t.archived && t.template_id != null && t.r3_slot == null)
        .sortBy('sort_order'),
    [dayKey],
    [],
  );

  if (!habits || habits.length === 0) return null;

  const ids = habits.map((h) => `task-${h.id}`);

  return (
    <div className="col gap-1">
      <p className="tiny text-sage-deep">habits</p>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="col gap-0">
          {habits.map((h, i) => (
            <TaskRow key={h.id} task={h} index={i} showNumber showSkip />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
