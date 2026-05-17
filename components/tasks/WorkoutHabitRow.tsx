'use client';

import { useState } from 'react';
import { HandCheckbox } from '@/components/ui/HandCheckbox';
import {
  uncompleteTask,
  updateTask,
  startTimer,
  pauseTimer,
} from '@/lib/idb/tasks';
import { useUiStore } from '@/lib/store/useUiStore';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { elapsedLabel } from '@/lib/time/dayKey';
import { cn } from '@/lib/utils';
import type { HabitTemplate, Task, WorkoutProgress } from '@/lib/idb/db';

interface Props {
  task: Task;
  template: HabitTemplate;
}

/** Rendered in place of TaskRow for workout-kind habit instances. Shows
 *  today's exercises with per-set checkboxes; checking sets advances the
 *  task's workout_progress jsonb. */
export function WorkoutHabitRow({ task, template }: Props) {
  const requestCompletion = useUiStore((s) => s.requestCompletion);
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const tickMs = useTimerStore((s) => s.tickMs);

  const [expanded, setExpanded] = useState(true);

  const isActive = activeTaskId === task.id;
  const isRunning = task.state === 'running';

  // Today's plan from the template's per-weekday map.
  const dow = task.day_key
    ? new Date(`${task.day_key}T00:00:00`).getDay()
    : new Date().getDay();
  const plan = template.workout_data?.[dow] ?? { title: '', exercises: [] };

  const progress: WorkoutProgress = task.workout_progress ?? {};

  const totalSets = plan.exercises.reduce((s, ex) => s + ex.sets, 0);
  const doneSets = plan.exercises.reduce((s, ex) => {
    const d = progress[ex.id]?.setsDone ?? 0;
    return s + Math.min(d, ex.sets);
  }, 0);

  function handleCheck() {
    if (task.state === 'done') {
      void uncompleteTask(task.id);
    } else {
      requestCompletion(task.id);
    }
  }

  async function handleTimer() {
    if (task.state === 'running') await pauseTimer(task.id);
    else await startTimer(task.id);
  }

  async function setSetsDone(exerciseId: string, value: number, max: number) {
    const clamped = Math.max(0, Math.min(value, max));
    const next: WorkoutProgress = {
      ...progress,
      [exerciseId]: { setsDone: clamped },
    };
    await updateTask(task.id, { workout_progress: next });
  }

  const liveElapsed = isActive
    ? tickMs
    : task.state === 'running' && task.started_at
      ? task.elapsed_ms + (Date.now() - task.started_at)
      : task.elapsed_ms;

  const checkState =
    task.state === 'done' ? 'done' : isRunning ? 'running' : 'open';

  const isRestDay = plan.exercises.length === 0;

  return (
    <div className="col" style={{ gap: 0 }}>
      {/* Header row — matches TaskRow visual scale */}
      <div className="flex items-center gap-3 py-1 group" style={{ minHeight: 28 }}>
        <span style={{ flexShrink: 0 }}>
          <HandCheckbox state={checkState} onClick={handleCheck} />
        </span>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          aria-expanded={expanded}
        >
          <span
            className={cn(
              'task-label flex-1 min-w-0',
              task.state === 'done' && 'strike',
            )}
          >
            <span style={{ marginRight: 6 }}>{expanded ? '▾' : '▸'}</span>
            {task.title}
            {plan.title && (
              <span
                className="ui"
                style={{
                  fontSize: 12,
                  color: 'var(--ochre-deep)',
                  marginLeft: 8,
                  letterSpacing: '0.04em',
                }}
              >
                {plan.title.toLowerCase()}
              </span>
            )}
          </span>

          {!isRestDay && (
            <span
              className="hand num shrink-0"
              style={{
                fontSize: 16,
                color: doneSets === totalSets ? 'var(--sage-deep)' : 'var(--ink-faint)',
                whiteSpace: 'nowrap',
              }}
            >
              {doneSets}/{totalSets} sets
            </span>
          )}
        </button>

        {task.state !== 'done' && (
          <button
            type="button"
            onClick={handleTimer}
            className="mono opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
            style={{
              color: isRunning ? 'var(--terra-deep)' : 'var(--ink-faint)',
              fontSize: 11,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isRunning ? `⏸ ${elapsedLabel(liveElapsed)}` : '▸ start'}
          </button>
        )}
      </div>

      {/* Expanded exercise list */}
      {expanded && !isRestDay && (
        <div
          className="col"
          style={{
            paddingLeft: 30,
            paddingTop: 4,
            paddingBottom: 8,
            gap: 4,
          }}
        >
          {plan.exercises.map((ex) => {
            const done = progress[ex.id]?.setsDone ?? 0;
            return (
              <div
                key={ex.id}
                className="row items-center"
                style={{ gap: 8, flexWrap: 'wrap' }}
              >
                <div className="row" style={{ gap: 3, flexShrink: 0 }}>
                  {Array.from({ length: ex.sets }, (_, i) => {
                    const isDone = i < done;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setSetsDone(
                            ex.id,
                            isDone && i === done - 1 ? done - 1 : i + 1,
                            ex.sets,
                          )
                        }
                        aria-label={`Set ${i + 1} of ${ex.sets}`}
                        title={isDone ? 'mark undone' : 'mark done'}
                        style={{
                          width: 16,
                          height: 16,
                          border: '1.5px solid',
                          borderColor: isDone
                            ? 'var(--sage-deep)'
                            : 'var(--ink-faint)',
                          borderRadius: 3,
                          background: isDone ? 'var(--sage-deep)' : 'transparent',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--paper)',
                          fontSize: 10,
                          lineHeight: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isDone ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
                <span
                  className="hand"
                  style={{ fontSize: 16, color: 'var(--ink)', flex: 1, minWidth: 100 }}
                >
                  {ex.sets}×{ex.reps} {ex.name}
                  {ex.weight && (
                    <span
                      className="ui muted"
                      style={{ fontSize: 12, marginLeft: 6 }}
                    >
                      @ {ex.weight}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {expanded && isRestDay && (
        <p
          className="hand muted italic"
          style={{ fontSize: 14, paddingLeft: 30, paddingBottom: 6 }}
        >
          rest day — no exercises scheduled
        </p>
      )}
    </div>
  );
}
