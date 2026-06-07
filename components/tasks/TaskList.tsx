'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb, type Task, type TaskLabel } from '@/lib/idb/db';
import { TaskRow } from './TaskRow';
import { AddTaskGhostRow } from './AddTaskGhostRow';
import { todayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';
import { moveTaskToDay } from '@/lib/idb/tasks';
import { toast } from '@/lib/store/useToastStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { cn } from '@/lib/utils';

interface TaskListProps {
  dayKey?: string;
  /** Render a dimmed task-shaped "+ add task" row at the bottom. */
  showAddRow?: boolean;
}

/** Combined open + done task list. Open sorted by sort_order; done floats to
 *  the bottom in completion order. When viewing today's list, unfinished
 *  tasks from past days are surfaced at the top with a "from MM/DD" chip. */
export function TaskList({ dayKey = todayKey(), showAddRow = false }: TaskListProps) {
  const dayLabelFilter = useUiStore((s) => s.dayLabelFilter);
  const isViewingToday = dayKey === todayKey();

  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter(
          (t) =>
            !t.archived &&
            t.template_id == null &&
            t.habit_title == null &&
            t.r3_slot == null,
        )
        .toArray(),
    [dayKey],
    [],
  );

  // Carry-over: unfinished, non-skipped tasks from prior days. Limited to the
  // today view so historical day views still show only that day's own tasks.
  // R3 tasks ARE included here so an incomplete Rule-of-3 priority from
  // yesterday can be rolled forward just like any other task — clicking the
  // row opens move-to-day, which clears r3_slot when relocating.
  const carryover = useLiveQuery<Task[], Task[]>(
    () =>
      isViewingToday
        ? getDb()
            .tasks.where('day_key')
            .below(dayKey)
            .filter(
              (t) =>
                !t.archived &&
                !t.skipped &&
                t.template_id == null &&
                t.habit_title == null &&
                t.state !== 'done',
            )
            .toArray()
        : Promise.resolve([] as Task[]),
    [dayKey, isViewingToday],
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

  const filteredCarryover = useMemo(() => {
    if (!dayLabelFilter) return carryover ?? [];
    const matchIds = new Set((taskLabels ?? []).map((tl) => tl.task_id));
    return (carryover ?? []).filter((t) => matchIds.has(t.id));
  }, [carryover, taskLabels, dayLabelFilter]);

  // Whole container is droppable as `day-<key>` so R3 cards can be demoted by
  // dropping into the Tasks region — even when empty.
  const droppable = useDroppable({ id: `day-${dayKey}` });

  const sortedToday = filteredTasks.slice().sort((a, b) => {
    if (a.state === 'done' && b.state !== 'done') return 1;
    if (a.state !== 'done' && b.state === 'done') return -1;
    if (a.state === 'done' && b.state === 'done') {
      return (b.completed_at ?? b.updated_at) - (a.completed_at ?? a.updated_at);
    }
    return a.sort_order - b.sort_order;
  });

  const sortedCarryover = filteredCarryover.slice().sort((a, b) => {
    const ak = a.day_key ?? '';
    const bk = b.day_key ?? '';
    if (ak !== bk) return ak.localeCompare(bk);
    return a.sort_order - b.sort_order;
  });

  const hasContent = sortedCarryover.length > 0 || sortedToday.length > 0;
  const ids = sortedToday.map((t) => `task-${t.id}`);

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn('paper wobble transition-colors')}
      style={{
        // "Flower pot" palette pulled from CSS vars so the Berkeley accent
        // can swap terracotta → Berkeley blue without touching this file.
        border: '1.5px solid var(--tasks-box-border)',
        borderRadius: 6,
        padding: '14px 22px',
        background: droppable.isOver
          ? 'var(--tasks-box-bg-active)'
          : 'var(--tasks-box-bg)',
        position: 'relative',
        minHeight: hasContent ? undefined : 110,
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
          background: 'var(--tasks-box-accent)',
          borderRadius: 2,
          opacity: 0.85,
        }}
      />

      {!hasContent ? (
        <div
          className="col"
          style={{ gap: 6, textAlign: 'center', padding: '12px 0 4px' }}
        >
          <span
            className="hand"
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--terra-deep)',
              display: 'block',
            }}
          >
            {dayLabelFilter ? 'nothing tagged here yet' : 'all clear ✿'}
          </span>
          {(droppable.isOver || dayLabelFilter) && (
            <span
              className="ui"
              style={{ fontSize: 13, color: 'var(--ink-faint)', display: 'block' }}
            >
              {droppable.isOver
                ? 'drop here to move out of rule of 3'
                : 'no tasks match this label — clear the filter to see everything'}
            </span>
          )}
          {showAddRow && !dayLabelFilter && (
            <div style={{ marginTop: 8 }}>
              <AddTaskGhostRow />
            </div>
          )}
        </div>
      ) : (
        <div className="col" style={{ gap: 6 }}>
          {sortedCarryover.length > 1 && (
            <RollOverAllRow tasks={sortedCarryover} targetDayKey={dayKey} />
          )}
          {sortedCarryover.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showNumber={false}
              draggable={false}
              carryover
            />
          ))}
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {sortedToday.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                index={i}
                showNumber={task.state !== 'done'}
              />
            ))}
          </SortableContext>
          {showAddRow && <AddTaskGhostRow />}
        </div>
      )}
    </div>
  );
}

// ── Roll-over-all banner ─────────────────────────────────────────────────

/** Compact row that appears above the carryover list when there are 2+
 *  carryover tasks, offering a one-click way to pull every unfinished
 *  task from previous days onto today. Confirms first so an accidental
 *  click doesn't wipe out the user's "from MM/DD" history all at once. */
function RollOverAllRow({
  tasks, targetDayKey,
}: {
  tasks: Task[];
  targetDayKey: string;
}) {
  async function handleRollOver() {
    const ok = await themedConfirm({
      title: `roll over ${tasks.length} task${tasks.length === 1 ? '' : 's'}?`,
      body: 'each will be moved onto today. r3 slots clear automatically.',
      confirmLabel: 'roll over',
      cancelLabel: 'cancel',
    });
    if (!ok) return;
    // moveTaskToDay clears r3_slot as part of the move — same path the
    // single-row prompt uses, so behavior is consistent.
    await Promise.all(tasks.map((t) => moveTaskToDay(t.id, targetDayKey)));
    toast(`rolled over ${tasks.length} task${tasks.length === 1 ? '' : 's'} to today`);
  }

  return (
    <div
      className="row items-center justify-between"
      style={{
        padding: '6px 8px',
        gap: 8,
        borderBottom: '1px dashed var(--rule)',
        marginBottom: 4,
      }}
    >
      <span
        className="ui"
        style={{
          fontSize: 12,
          color: 'var(--ink-faint)',
          letterSpacing: '0.04em',
        }}
      >
        {tasks.length} carried over from past days
      </span>
      <button
        type="button"
        onClick={() => void handleRollOver()}
        className="ui-b wobble hover:bg-paper-warm transition-colors"
        style={{
          border: '1.5px solid var(--terra-deep)',
          background: 'transparent',
          color: 'var(--terra-deep)',
          padding: '4px 12px',
          borderRadius: 5,
          fontSize: 12,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ↻ Roll over all
      </button>
    </div>
  );
}
