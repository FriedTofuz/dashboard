'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb } from '@/lib/idb/db';
import { TaskRow } from './TaskRow';
import { WorkoutHabitRow } from './WorkoutHabitRow';

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

  // Fetch the templates so we can branch on kind === 'workout'.
  const templates = useLiveQuery(
    () => getDb().habit_templates.toArray(),
    [],
    [],
  );
  const templateById = new Map((templates ?? []).map((t) => [t.id, t]));

  return (
    <div className="col habits-section" style={{ gap: 18 }}>
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
            background: 'var(--ochre-tint)',
            position: 'relative',
          }}
        >
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
              {habits.map((h, i) => {
                const tmpl = h.template_id ? templateById.get(h.template_id) : undefined;
                if (tmpl?.kind === 'workout') {
                  return <WorkoutHabitRow key={h.id} task={h} template={tmpl} />;
                }
                return <TaskRow key={h.id} task={h} index={i} showNumber={false} showSkip />;
              })}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
