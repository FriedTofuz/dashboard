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

  return (
    <div className="col" style={{ gap: 18 }}>
      <p className="section-head terra">
        Daily habits
        <span className="sub">— quiet, repeating</span>
      </p>

      {!habits || habits.length === 0 ? (
        <div className="empty-state">
          <span className="headline">no habits yet</span>
          <span className="sub">tap settings to add the ones you want to hold</span>
        </div>
      ) : (
        <div
          className="paper ruled wobble"
          style={{
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: '14px 22px',
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)',
          }}
        >
          <SortableContext
            items={habits.map((h) => `task-${h.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="col" style={{ gap: 0 }}>
              {habits.map((h, i) => (
                <TaskRow key={h.id} task={h} index={i} showNumber={false} showSkip />
              ))}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
