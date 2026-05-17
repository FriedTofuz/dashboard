'use client';

import { useDroppable } from '@dnd-kit/core';
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
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const tickMs = useTimerStore((s) => s.tickMs);
  const isRunning = task && task.state === 'running';
  const isActive = task && activeTaskId === task.id;

  const droppable = useDroppable({ id: `r3-${slot}-${dayKey}` });

  const elapsed = isActive
    ? tickMs
    : task?.started_at
      ? task.elapsed_ms + (Date.now() - task.started_at)
      : task?.elapsed_ms ?? 0;

  async function handleRemove() {
    if (task) await setR3Slot(task.id, null, dayKey);
  }

  // §8 — empty R3 slot uses dashed-border empty-state pattern
  if (!task) {
    return (
      <div
        ref={droppable.setNodeRef}
        className={cn(
          'ink-box-dashed rounded-card transition-colors flex-1 col justify-between',
          droppable.isOver && 'wash-sage',
        )}
        style={{
          minHeight: 132,
          padding: '16px 18px 14px',
          background: droppable.isOver ? undefined : 'transparent',
        }}
      >
        <div className="row items-center justify-between">
          <span className="tiny">priority {slot}</span>
          <span className="tiny" style={{ opacity: 0.7 }}>—</span>
        </div>
        <div>
          <p className="hand" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.15 }}>
            {droppable.isOver ? 'drop here' : 'what matters most?'}
          </p>
          <p className="ui" style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 2 }}>
            tap to set · keep it to 3
          </p>
        </div>
      </div>
    );
  }

  // §3 — populated slots use uniform sage-wash background, ink border
  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        'rounded-card relative transition-colors flex-1 col justify-between wobble',
        droppable.isOver && 'wash-sage',
      )}
      style={{
        minHeight: 132,
        padding: '16px 18px 14px',
        background: 'var(--sage-wash)',
        border: '1.6px solid var(--ink)',
      }}
    >
      {isRunning && <div className="tape" />}

      <div className="row items-start justify-between" style={{ gap: 6 }}>
        <span className="tiny">priority {slot}</span>
        <span
          className={cn('num', isRunning ? 'mono' : 'mono')}
          style={{
            color:
              task.state === 'done'
                ? 'var(--sage-deep)'
                : isRunning
                  ? 'var(--terra-deep)'
                  : 'var(--ink-faint)',
            fontWeight: task.state === 'done' ? 600 : 500,
            fontFamily:
              task.state === 'done'
                ? 'var(--font-dm-sans), system-ui, sans-serif'
                : 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: task.state === 'done' ? 12 : 11,
            letterSpacing: task.state === 'done' ? '0.08em' : '0.02em',
            textTransform: task.state === 'done' ? 'uppercase' : 'none',
          }}
        >
          {task.state === 'done'
            ? '✓ done'
            : isRunning
              ? `▸ ${elapsedLabel(elapsed)} / ${task.est_minutes}m`
              : `${task.est_minutes}m`}
        </span>
      </div>

      <span
        className={cn(
          'hand',
          task.state === 'done' && 'strike',
        )}
        style={{
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1.1,
          color: task.state === 'done' ? 'var(--ink-faint)' : 'var(--ink)',
          display: 'block',
        }}
      >
        {task.title}
      </span>

      <p
        className="hand"
        style={{ fontSize: 15, color: 'var(--ink-faint)', lineHeight: 1.2 }}
      >
        {task.state === 'done' && task.actual_ms != null
          ? `finished ${Math.round(task.actual_ms / 60000)}min${
              task.actual_ms < task.est_minutes * 60000
                ? ` · ${task.est_minutes - Math.round(task.actual_ms / 60000)}min under`
                : ''
            }`
          : isRunning
            ? `running · ${task.est_minutes}min est.`
            : `open · ${task.est_minutes}min est.`}
      </p>

      <button
        type="button"
        onClick={handleRemove}
        className="tiny absolute opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        style={{ top: 6, right: 8 }}
        aria-label="Remove from Rule of 3"
      >
        ✕
      </button>
    </div>
  );
}
