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
    <div className="col habits-section" style={{ gap: 18 }}>
      <p className="section-head ochre">
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
          className="paper wobble"
          style={{
            border: '1.5px solid var(--ochre-deep)',
            borderRadius: 6,
            padding: '14px 22px',
            background:
              'linear-gradient(0deg, var(--ochre-tint), var(--ochre-tint)), var(--paper)',
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)',
            position: 'relative',
          }}
        >
          {/* Left ochre rail to echo the R3 "everything green" accent */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 8,
              bottom: 8,
              left: 0,
              width: 3,
              background: 'var(--ochre)',
              borderRadius: 2,
              opacity: 0.7,
            }}
          />

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
