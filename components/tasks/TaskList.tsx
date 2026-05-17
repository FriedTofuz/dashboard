'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb, type TaskLabel } from '@/lib/idb/db';
import { TaskRow } from './TaskRow';
import { AddTaskGhostRow } from './AddTaskGhostRow';
import { todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

interface TaskListProps {
  dayKey?: string;
  /** Render a dimmed task-shaped "+ add task" row at the bottom. */
  showAddRow?: boolean;
}

/** Combined open + done task list. Open sorted by sort_order; done floats to
 *  the bottom in completion order. The empty-state container itself is a
 *  droppable so users can drag a Rule of 3 task back into a clean list. */
export function TaskList({ dayKey = todayKey(), showAddRow = false }: TaskListProps) {
  const dayLabelFilter = useUiStore((s) => s.dayLabelFilter);

  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter(
          (t) =>
            !t.archived &&
            t.template_id == null &&
            t.r3_slot == null,
        )
        .toArray(),
    [dayKey],
    [],
  );

  // Label-filter join: pull all task_labels rows once and filter in memory.
  const taskLabels = useLiveQuery<TaskLabel[], TaskLabel[]>(
    () =>
      dayLabelFilter
        ? getDb().task_labels.where('label_id').equals(dayLabelFilter).toArray()
        : Promise.resolve([] as TaskLabel[]),
    [dayLabelFilter],
    [],
  );

  const filteredTasks = useMemo(() => {
    if (!dayLabelFilter) return tasks ?? [];
    const matchIds = new Set((taskLabels ?? []).map((tl) => tl.task_id));
    return (tasks ?? []).filter((t) => matchIds.has(t.id));
  }, [tasks, taskLabels, dayLabelFilter]);

  // Make the whole container droppable as `day-<key>` so R3 cards can be
  // demoted by dropping into the Tasks region — even when empty.
  const droppable = useDroppable({ id: `day-${dayKey}` });

  const sorted = filteredTasks.slice().sort((a, b) => {
    if (a.state === 'done' && b.state !== 'done') return 1;
    if (a.state !== 'done' && b.state === 'done') return -1;
    if (a.state === 'done' && b.state === 'done') {
      return (b.completed_at ?? b.updated_at) - (a.completed_at ?? a.updated_at);
    }
    return a.sort_order - b.sort_order;
  });

  // ── Empty state — droppable target with dashed sage border ─────────────
  if (sorted.length === 0) {
    return (
      <div
        ref={droppable.setNodeRef}
        className={cn('col transition-colors')}
        style={{
          gap: 6,
          border: droppable.isOver
            ? '2px solid var(--sage-deep)'
            : '2px dashed var(--sage-deep)',
          borderRadius: 6,
          padding: '22px 18px',
          background: droppable.isOver ? 'var(--sage-tint)' : 'transparent',
          minHeight: 96,
          textAlign: 'center',
        }}
      >
        <span
          className="hand"
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--terra-deep)',
            display: 'block',
            marginBottom: 2,
          }}
        >
          {dayLabelFilter ? 'nothing tagged here yet' : 'all clear ✿'}
        </span>
        <span
          className="ui"
          style={{ fontSize: 13, color: 'var(--ink-faint)', display: 'block' }}
        >
          {droppable.isOver
            ? 'drop here to move out of rule of 3'
            : dayLabelFilter
              ? 'no tasks match this label — clear the filter to see everything'
              : 'drag a rule of 3 task here, or use the ghost row below'}
        </span>
        {showAddRow && !dayLabelFilter && (
          <div style={{ marginTop: 10 }}>
            <AddTaskGhostRow />
          </div>
        )}
      </div>
    );
  }

  const ids = sorted.map((t) => `task-${t.id}`);

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn('transition-colors')}
      style={{
        borderRadius: 4,
        outline: droppable.isOver ? '2px solid var(--sage-deep)' : '2px solid transparent',
        outlineOffset: 2,
        background: droppable.isOver ? 'var(--sage-tint)' : 'transparent',
        padding: droppable.isOver ? 6 : 0,
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="col" style={{ gap: 6 }}>
          {sorted.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              index={i}
              showNumber={task.state !== 'done'}
            />
          ))}
          {showAddRow && <AddTaskGhostRow />}
        </div>
      </SortableContext>
    </div>
  );
}
