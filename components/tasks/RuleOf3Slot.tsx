'use client';

import { cn } from '@/lib/utils';
import { setR3Slot } from '@/lib/idb/tasks';
import { elapsedLabel } from '@/lib/time/dayKey';
import { useTimerStore } from '@/lib/store/useTimerStore';
import type { Task } from '@/lib/idb/db';

interface RuleOf3SlotProps {
  slot: 1 | 2 | 3;
  task?: Task;
  dayKey: string;
}

export function RuleOf3Slot({ slot, task, dayKey }: RuleOf3SlotProps) {
  const { activeTaskId, tickMs } = useTimerStore();
  const isRunning = task && task.state === 'running';
  const isActive = task && activeTaskId === task.id;

  const elapsed = isActive
    ? tickMs
    : task?.started_at
      ? task.elapsed_ms + (Date.now() - task.started_at)
      : task?.elapsed_ms ?? 0;

  async function handleRemove() {
    if (task) await setR3Slot(task.id, null, dayKey);
  }

  if (!task) {
    return (
      <div className="ink-box-dashed paper rounded-card p-4 flex-1 col gap-1 min-h-[90px] justify-center">
        <span className="tiny">priority {slot}</span>
        <p className="font-hand text-body-lg muted" style={{ opacity: 0.55 }}>
          what matters most?
        </p>
        <p className="tiny" style={{ opacity: 0.5 }}>
          — tap to set —
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'paper rounded-card p-4 flex-1 col gap-1 min-h-[90px] relative',
        task.state === 'done' ? 'ink-box-soft' : 'ink-box-sage',
        isRunning && 'wash-terra',
      )}
    >
      {isRunning && <div className="tape" />}

      <div className="row items-center justify-between">
        <span className="tiny">priority {slot}</span>
        <span className={cn('mono text-[11px]', isRunning ? 'text-terra' : 'muted')}>
          {task.state === 'done'
            ? '✓ done'
            : isRunning
              ? `▸ running ${elapsedLabel(elapsed)}`
              : `${task.est_minutes}m`}
        </span>
      </div>

      <span className={cn('font-hand text-body-lg leading-tight', task.state === 'done' && 'strike')}>
        {task.title}
      </span>

      <button
        type="button"
        onClick={handleRemove}
        className="tiny absolute top-2 right-2 opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        aria-label="Remove from Rule of 3"
      >
        ✕
      </button>
    </div>
  );
}
