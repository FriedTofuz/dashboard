'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  setR3Slot,
  startTimer,
  pauseTimer,
  uncompleteTask,
  deleteTask,
  duplicateTask,
  moveTaskToDay,
} from '@/lib/idb/tasks';
import { elapsedLabel, addDays } from '@/lib/time/dayKey';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { useUiStore } from '@/lib/store/useUiStore';
import type { Task } from '@/lib/idb/db';

interface RuleOf3SlotProps {
  slot: 1 | 2 | 3;
  task?: Task;
  dayKey: string;
}

export function RuleOf3Slot({ slot, task, dayKey }: RuleOf3SlotProps) {
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const tickMs = useTimerStore((s) => s.tickMs);
  const openEditor = useUiStore((s) => s.openEditor);
  const requestCompletion = useUiStore((s) => s.requestCompletion);
  const isRunning = task && task.state === 'running';
  const isActive = task && activeTaskId === task.id;

  const droppable = useDroppable({ id: `r3-${slot}-${dayKey}` });
  const sortable = useSortable({
    id: task ? `task-${task.id}` : `r3-empty-${slot}-${dayKey}`,
    disabled: !task || task.state === 'done',
  });

  const setRef = (node: HTMLElement | null) => {
    droppable.setNodeRef(node);
    sortable.setNodeRef(node);
  };

  const elapsed = isActive
    ? tickMs
    : task?.started_at
      ? task.elapsed_ms + (Date.now() - task.started_at)
      : task?.elapsed_ms ?? 0;

  // ── Empty slot ───────────────────────────────────────────────────────
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

  const cardStyle: React.CSSProperties = {
    minHeight: 132,
    padding: '16px 18px 14px',
    background: 'var(--sage-wash)',
    border: '1.6px solid var(--ink)',
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setRef}
      {...sortable.attributes}
      className={cn(
        'rounded-card relative transition-colors flex-1 col justify-between wobble group',
        droppable.isOver && 'wash-sage',
      )}
      style={cardStyle}
      onDoubleClick={() => openEditor(task.id)}
    >
      {isRunning && <div className="tape" />}

      <div className="row items-start justify-between" style={{ gap: 6 }}>
        <span className="tiny">priority {slot}</span>
        <span
          className="num"
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

      {/* Drag-grab zone — covers the label so the user can grab anywhere on
          the card EXCEPT the buttons in the corner */}
      <div
        className="cursor-grab active:cursor-grabbing flex-1 flex flex-col justify-end"
        style={{ minHeight: 0 }}
        {...(task.state !== 'done' ? sortable.listeners : {})}
      >
        <span
          className={cn('hand', task.state === 'done' && 'strike')}
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
          style={{ fontSize: 15, color: 'var(--ink-faint)', lineHeight: 1.2, margin: '4px 0 0' }}
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

        {task.description && (
          <p
            className="hand"
            style={{
              fontSize: 14,
              color: 'var(--ink-faint)',
              lineHeight: 1.25,
              margin: '4px 0 0',
              whiteSpace: 'pre-line',
            }}
          >
            {task.description}
          </p>
        )}

        {task.state === 'done' && task.completion_note && (
          <p
            className="hand"
            style={{
              fontSize: 14,
              color: 'var(--ink-faint)',
              fontStyle: 'italic',
              margin: '4px 0 0',
              whiteSpace: 'pre-line',
            }}
          >
            ⤷ {task.completion_note}
          </p>
        )}
      </div>

      {/* Action row — hover-revealed buttons in the top-right corner */}
      <div
        className="row absolute opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        style={{ top: 6, right: 8, gap: 4 }}
      >
        {task.state !== 'done' && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (task.state === 'running') void pauseTimer(task.id);
              else void startTimer(task.id);
            }}
            className="mono hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: isRunning ? 'var(--terra-deep)' : 'var(--ink-faint)',
              fontSize: 11,
              padding: '2px 4px',
              borderRadius: 3,
              cursor: 'pointer',
            }}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? '⏸' : '▸'}
          </button>
        )}

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (task.state === 'done') void uncompleteTask(task.id);
            else requestCompletion(task.id);
          }}
          className="hover:bg-paper-warm transition-colors"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--sage-deep)',
            fontSize: 12,
            padding: '2px 4px',
            borderRadius: 3,
            cursor: 'pointer',
          }}
          aria-label={task.state === 'done' ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.state === 'done' ? '↺' : '✓'}
        </button>

        <R3SlotMenu task={task} dayKey={dayKey} />
      </div>
    </div>
  );
}

// ── R3 slot menu ──────────────────────────────────────────────────────

interface R3SlotMenuProps {
  task: Task;
  dayKey: string;
}

function R3SlotMenu({ task, dayKey }: Omit<R3SlotMenuProps, 'slot'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openEditor = useUiStore((s) => s.openEditor);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="hover:bg-paper-warm transition-colors"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-faint)',
          fontSize: 14,
          padding: '0 4px',
          borderRadius: 3,
          cursor: 'pointer',
          lineHeight: 1,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Slot actions"
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="wobble"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: 4,
            minWidth: 180,
            boxShadow: 'var(--shadow)',
            zIndex: 30,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 13,
          }}
        >
          <SlotMenuItem onClick={() => { setOpen(false); openEditor(task.id); }}>
            edit
          </SlotMenuItem>
          <SlotMenuItem onClick={() => { setOpen(false); void duplicateTask(task.id); }}>
            duplicate
          </SlotMenuItem>
          <SlotMenuItem onClick={() => { setOpen(false); void setR3Slot(task.id, null, dayKey); }}>
            remove from rule of 3
          </SlotMenuItem>
          <SlotMenuItem
            onClick={() => {
              setOpen(false);
              void moveTaskToDay(task.id, addDays(dayKey, 1));
            }}
          >
            push to tomorrow
          </SlotMenuItem>
          <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
          <SlotMenuItem
            danger
            onClick={() => {
              setOpen(false);
              if (confirm(`Delete "${task.title}"? This can't be undone.`)) {
                void deleteTask(task.id);
              }
            }}
          >
            delete
          </SlotMenuItem>
        </div>
      )}
    </div>
  );
}

function SlotMenuItem({
  children, onClick, danger,
}: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="hover:bg-paper-warm transition-colors"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        color: danger ? 'var(--terra-deep)' : 'var(--ink)',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

