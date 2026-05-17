'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb } from '@/lib/idb/db';
import { TaskRow } from './TaskRow';
import { todayKey } from '@/lib/time/dayKey';

interface TaskListProps {
  dayKey?: string;
  kind: 'open' | 'done';
}

export function TaskList({ dayKey = todayKey(), kind }: TaskListProps) {
  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter(
          (t) =>
            !t.archived &&
            t.template_id == null &&
            t.r3_slot == null &&
            (kind === 'done' ? t.state === 'done' : t.state !== 'done'),
        )
        .sortBy('sort_order'),
    [dayKey, kind],
    [],
  );

  if (!tasks || tasks.length === 0) {
    if (kind === 'open') {
      // §8 — Today list, all clear
      return (
        <div className="empty-state">
          <span className="headline">all clear ✿</span>
          <span className="sub">the sunflower&apos;s having a great day</span>
        </div>
      );
    }
    // §8 — Done list, nothing finished yet
    return (
      <div className="empty-state">
        <span className="headline">nothing finished yet</span>
        <span className="sub">start with the smallest one</span>
      </div>
    );
  }

  const ids = tasks.map((t) => `task-${t.id}`);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="col" style={{ gap: 6 }}>
        {tasks.map((task, i) => (
          <TaskRow key={task.id} task={task} index={i} showNumber={kind === 'open'} />
        ))}
      </div>
    </SortableContext>
  );
}
