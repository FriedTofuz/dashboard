'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { HandCheckbox } from '@/components/ui/HandCheckbox';
import { elapsedLabel } from '@/lib/time/dayKey';
import {
  completeTask,
  uncompleteTask,
  startTimer,
  pauseTimer,
  skipTask,
} from '@/lib/idb/tasks';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { useUiStore } from '@/lib/store/useUiStore';
import type { Task } from '@/lib/idb/db';

interface TaskRowProps {
  task: Task;
  index?: number;
  showNumber?: boolean;
  draggable?: boolean;
  showSkip?: boolean;
}

export function TaskRow({
  task,
  index,
  showNumber = true,
  draggable = true,
  showSkip = false,
}: TaskRowProps) {
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const tickMs = useTimerStore((s) => s.tickMs);
  const openEditor = useUiStore((s) => s.openEditor);
  const isActive = activeTaskId === task.id;

  const sortable = useSortable({
    id: `task-${task.id}`,
    disabled: !draggable || task.state === 'done',
  });

  const liveElapsed = isActive
    ? tickMs
    : task.state === 'running' && task.started_at
      ? task.elapsed_ms + (Date.now() - task.started_at)
      : task.elapsed_ms;

  async function handleCheck() {
    if (task.state === 'done') await uncompleteTask(task.id);
    else await completeTask(task.id);
  }

  async function handleTimer() {
    if (task.state === 'running') await pauseTimer(task.id);
    else await startTimer(task.id);
  }

  const checkState =
    task.state === 'done' ? 'done' : task.state === 'running' ? 'running' : 'open';

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ ...style, minHeight: 32 }}
      {...sortable.attributes}
      className={cn(
        'flex items-center gap-3 py-1 group',
        task.state === 'done' && 'opacity-80',
        task.skipped && 'opacity-50',
      )}
    >
      {showNumber && index !== undefined && (
        <span className="num-prefix">{index + 1}.</span>
      )}

      <HandCheckbox state={checkState} onClick={handleCheck} />

      <div
        className="flex-1 min-w-0 cursor-grab active:cursor-grabbing flex items-center gap-3"
        {...(draggable && task.state !== 'done' ? sortable.listeners : {})}
        onDoubleClick={() => openEditor(task.id)}
      >
        <span
          className={cn(
            'task-label flex-1 min-w-0',
            (task.state === 'done' || task.skipped) && 'strike',
          )}
        >
          {task.title}
        </span>

        {task.state === 'running' ? (
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="mono num"
              style={{ color: 'var(--terra-deep)', fontSize: 12 }}
            >
              ▸ {elapsedLabel(liveElapsed)}
            </span>
            <div
              className="bar"
              style={{ width: 70, height: 6 }}
              role="progressbar"
              aria-valuenow={Math.round(liveElapsed / 60000)}
              aria-valuemax={task.est_minutes}
            >
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(100, (liveElapsed / (task.est_minutes * 60000)) * 100)}%`,
                }}
              />
            </div>
            <span className="mono num muted" style={{ fontSize: 11 }}>
              {task.est_minutes}m est
            </span>
          </div>
        ) : task.state === 'done' && task.actual_ms != null ? (
          <span
            className="hand num shrink-0"
            style={{ fontSize: 17, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}
          >
            — {Math.round(task.actual_ms / 60000)}m
            {task.actual_ms < task.est_minutes * 60000
              ? ` · ${task.est_minutes - Math.round(task.actual_ms / 60000)}m under`
              : ''}
          </span>
        ) : (
          <span
            className="hand num shrink-0"
            style={{ fontSize: 17, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}
          >
            — {task.est_minutes}min
          </span>
        )}
      </div>

      {showSkip && task.state !== 'done' && (
        <button
          type="button"
          onClick={() => skipTask(task.id, !task.skipped)}
          className="tiny opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={task.skipped ? 'Unskip' : 'Skip today'}
        >
          {task.skipped ? '↺ unskip' : 'skip'}
        </button>
      )}

      {task.state !== 'done' && (
        <button
          type="button"
          onClick={handleTimer}
          className={cn(
            'mono opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5',
            'focus-visible:opacity-100',
          )}
          style={{
            color:
              task.state === 'running' ? 'var(--terra-deep)' : 'var(--ink-faint)',
            fontSize: 11,
          }}
        >
          {task.state === 'running' ? '⏸' : '▸ start'}
        </button>
      )}
    </div>
  );
}
