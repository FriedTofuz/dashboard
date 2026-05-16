'use client';

import { useLiveQuery } from 'dexie-react-hooks';
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
      return (
        <p className="muted caption px-2 py-3 italic">
          — nothing else today —
        </p>
      );
    }
    return null;
  }

  return (
    <div className="col gap-0">
      {tasks.map((task, i) => (
        <TaskRow key={task.id} task={task} index={i} showNumber={kind === 'open'} />
      ))}
    </div>
  );
}
