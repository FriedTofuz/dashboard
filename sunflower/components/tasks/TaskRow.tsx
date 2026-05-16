'use client';

import { cn } from '@/lib/utils';
import { HandCheckbox } from '@/components/ui/HandCheckbox';
import { elapsedLabel } from '@/lib/time/dayKey';
import { completeTask, uncompleteTask, startTimer, pauseTimer } from '@/lib/idb/tasks';
import { useTimerStore } from '@/lib/store/useTimerStore';
import type { Task } from '@/lib/idb/db';

interface TaskRowProps {
  task: Task;
  index?: number;
  showNumber?: boolean;
}

export function TaskRow({ task, index, showNumber = true }: TaskRowProps) {
  const { activeTaskId, tickMs } = useTimerStore();
  const isActive = activeTaskId === task.id;

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

  const checkState = task.state === 'done' ? 'done' : task.state === 'running' ? 'running' : 'open';

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1.5 group',
        task.state === 'done' && 'opacity-70',
      )}
    >
      {showNumber && index !== undefined && (
        <span className="num pt-0.5">{index + 1}.</span>
      )}

      <HandCheckbox state={checkState} onClick={handleCheck} />

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'font-hand text-body leading-snug',
            task.state === 'done' && 'strike',
          )}
        >
          {task.title}
        </span>

        {/* Running timer display */}
        {task.state === 'running' && (
          <div className="flex items-center gap-3 mt-0.5">
            <span className="mono text-terra text-[11px]">
              ▸ {elapsedLabel(liveElapsed)} elapsed
            </span>
            <div
              className="bar"
              style={{ width: 80, height: 6 }}
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
            <span className="mono muted text-[11px]">{task.est_minutes}m est</span>
          </div>
        )}

        {/* Completion note */}
        {task.state === 'done' && task.actual_ms != null && (
          <div className="tiny mt-0.5">
            finished {Math.round(task.actual_ms / 60000)}m
            {task.actual_ms < task.est_minutes * 60000
              ? ` · ${task.est_minutes - Math.round(task.actual_ms / 60000)}m under`
              : ''}
          </div>
        )}
      </div>

      {/* Timer button — only for non-done tasks */}
      {task.state !== 'done' && (
        <button
          type="button"
          onClick={handleTimer}
          className={cn(
            'mono text-[11px] opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5',
            'focus-visible:opacity-100',
            task.state === 'running' ? 'text-terra' : 'muted',
          )}
        >
          {task.state === 'running' ? '⏸' : '▸ start'}
        </button>
      )}
    </div>
  );
}
