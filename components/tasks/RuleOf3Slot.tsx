'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  startTimer,
  pauseTimer,
  uncompleteTask,
  deleteTask,
  duplicateTask,
  moveTaskToDay,
  createTask,
} from '@/lib/idb/tasks';
import { elapsedLabel, addDays, formatDayLabel } from '@/lib/time/dayKey';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import type { Task } from '@/lib/idb/db';

interface RuleOf3SlotProps {
  slot: 1 | 2 | 3;
  task?: Task;
  dayKey: string;
}

/** Format the done-meta as "✓ Done · −3m" / "✓ Done · +2m" / "✓ Done". */
function formatDoneDelta(estMinutes: number, actualMs: number | null): string {
  if (actualMs == null) return '✓ Done';
  const actualMin = Math.round(actualMs / 60000);
  const delta = actualMin - estMinutes;
  if (delta === 0) return '✓ Done · on time';
  const sign = delta > 0 ? '+' : '−';
  return `✓ Done · ${sign}${Math.abs(delta)}m`;
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
          'rounded-card transition-colors flex-1 col justify-between wobble',
          droppable.isOver && 'wash-sage',
        )}
        style={{
          minHeight: 132,
          padding: '16px 18px 14px',
          background: droppable.isOver ? undefined : 'transparent',
          border: droppable.isOver
            ? '1.6px solid var(--sage-deep)'
            : '1.5px dashed var(--ink-faint)',
          borderRadius: 4,
        }}
      >
        <div className="row items-center justify-between">
          <span className="tiny">priority {slot}</span>
          <span className="tiny" style={{ opacity: 0.7 }}>—</span>
        </div>
        <div>
          {(droppable.isOver || slot === 1) && (
            <p className="hand" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.15 }}>
              {droppable.isOver ? 'drop here' : 'what matters most?'}
            </p>
          )}
          <p
            className="ui"
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              marginTop: droppable.isOver || slot === 1 ? 2 : 0,
            }}
          >
            tap to set · keep it to 3
          </p>
        </div>
      </div>
    );
  }

  const isDropTarget = droppable.isOver && !sortable.isDragging;

  const cardStyle: React.CSSProperties = {
    minHeight: 132,
    padding: '16px 18px 14px',
    background: 'var(--sage-wash)',
    border: isDropTarget
      ? '2px solid var(--sage-deep)'
      : '1.6px solid var(--ink)',
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    // Hide the original card entirely while dragging; DragOverlay shows the
    // visual proxy at the cursor instead.
    opacity: sortable.isDragging ? 0 : 1,
  };

  // Build the top-right meta string per state.
  const metaText =
    task.state === 'done'
      ? formatDoneDelta(task.est_minutes, task.actual_ms)
      : isRunning
        ? `▸ ${elapsedLabel(elapsed)} / ${task.est_minutes}m`
        : `${task.est_minutes}m`;

  const metaColor =
    task.state === 'done'
      ? 'var(--sage-deep)'
      : isRunning
        ? 'var(--terra-deep)'
        : 'var(--ink-faint)';

  const metaIsUiFont = task.state === 'done';

  return (
    <div
      ref={setRef}
      {...sortable.attributes}
      className={cn(
        'rounded-card relative transition-colors flex-1 col justify-between wobble group',
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
            color: metaColor,
            fontWeight: metaIsUiFont ? 600 : 500,
            fontFamily: metaIsUiFont
              ? 'var(--font-dm-sans), system-ui, sans-serif'
              : 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: metaIsUiFont ? 12 : 11,
            letterSpacing: metaIsUiFont ? '0.08em' : '0.02em',
            textTransform: metaIsUiFont ? 'uppercase' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {metaText}
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
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.1,
            color: task.state === 'done' ? 'var(--ink-faint)' : 'var(--ink)',
            display: 'block',
          }}
        >
          {task.title}
        </span>

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

      {/* Action row — pinned to bottom-right, larger icons */}
      <div
        className="row absolute opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        style={{ bottom: 8, right: 10, gap: 4 }}
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
              fontSize: 16,
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              minWidth: 28,
              minHeight: 28,
            }}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            title={isRunning ? 'Pause timer' : 'Start timer'}
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
            fontSize: 17,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            minWidth: 28,
            minHeight: 28,
          }}
          aria-label={task.state === 'done' ? 'Mark incomplete' : 'Mark complete'}
          title={task.state === 'done' ? 'Mark incomplete' : 'Mark complete'}
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

function R3SlotMenu({ task, dayKey }: R3SlotMenuProps) {
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

  async function handleDelete() {
    setOpen(false);
    const ok = await themedConfirm({
      title: `delete "${task.title}"?`,
      body: 'this can\'t be undone.',
      confirmLabel: 'delete',
      cancelLabel: 'keep it',
      danger: true,
    });
    if (!ok) return;
    const snapshot = { ...task };
    await deleteTask(task.id);
    toast(`deleted "${task.title}"`, {
      action: {
        label: 'undo',
        onAction: () => {
          void createTask(
            {
              day_key: snapshot.day_key,
              template_id: snapshot.template_id,
              title: snapshot.title,
              description: snapshot.description,
              est_minutes: snapshot.est_minutes,
              state: snapshot.state,
              started_at: null,
              elapsed_ms: snapshot.elapsed_ms,
              actual_ms: snapshot.actual_ms,
              completed_at: snapshot.completed_at,
              completion_note: snapshot.completion_note,
              r3_slot: snapshot.r3_slot,
              sort_order: snapshot.sort_order,
              skipped: snapshot.skipped,
              archived: snapshot.archived,
            },
            snapshot.user_id,
          );
        },
      },
    });
  }

  async function handlePushTomorrow() {
    setOpen(false);
    const target = addDays(dayKey, 1);
    await moveTaskToDay(task.id, target);
    const { monthDay } = formatDayLabel(target);
    toast(`pushed to ${monthDay}`, {
      action: {
        label: 'undo',
        onAction: () => { void moveTaskToDay(task.id, dayKey); },
      },
    });
  }

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
          fontSize: 18,
          lineHeight: 1,
          padding: '4px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          minWidth: 28,
          minHeight: 28,
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
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 6,
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
          <SlotMenuItem
            onClick={() => {
              setOpen(false);
              void duplicateTask(task.id).then(() => toastSuccess('duplicated'));
            }}
          >
            duplicate
          </SlotMenuItem>
          <SlotMenuItem onClick={handlePushTomorrow}>
            push to tomorrow
          </SlotMenuItem>
          <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
          <SlotMenuItem danger onClick={handleDelete}>
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
