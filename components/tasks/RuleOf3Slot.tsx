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
  updateTask,
} from '@/lib/idb/tasks';
import { elapsedLabel, addDays, formatDayLabel, nextWeekday, todayKey } from '@/lib/time/dayKey';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { renderRichText } from '@/lib/richText';
import type { Subtask, Task } from '@/lib/idb/db';

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
          'r3-card rounded-card transition-colors flex-1 col justify-between wobble',
          droppable.isOver && 'wash-sage',
        )}
        style={{
          minHeight: 132,
          padding: '16px 18px 14px',
          background: droppable.isOver ? undefined : 'transparent',
          border: droppable.isOver
            ? '1.6px solid var(--sage-deep)'
            : '1.5px dashed var(--ink-faint)',
          borderRadius: 6,
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
      ? '1.6px solid var(--sage-deep)'
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
        'r3-card rounded-card relative transition-colors flex-1 col wobble group',
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
          the card EXCEPT the buttons in the corner. Top-aligned content;
          reserve bottom space so the absolute action buttons never sit on
          top of the description / subtasks. */}
      <div
        className="cursor-grab active:cursor-grabbing flex-1 flex flex-col justify-start"
        style={{ minHeight: 0, marginTop: 8, paddingBottom: 36 }}
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
            {renderRichText(task.description)}
          </p>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <R3SubtaskList taskId={task.id} subtasks={task.subtasks} />
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
            ⤷ {renderRichText(task.completion_note)}
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

        <R3SlotMenu task={task} />
      </div>
    </div>
  );
}

// ── R3 slot menu ──────────────────────────────────────────────────────

interface R3SlotMenuProps {
  task: Task;
}

function R3SlotMenu({ task }: R3SlotMenuProps) {
  const [open, setOpen] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openEditor = useUiStore((s) => s.openEditor);
  const currentDayKey = useUiStore((s) => s.currentDayKey);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowMoveSubmenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function close() { setOpen(false); setShowMoveSubmenu(false); }

  async function handleDelete() {
    close();
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

  async function handleMoveTo(targetKey: string) {
    close();
    const fromDayKey = task.day_key;
    await moveTaskToDay(task.id, targetKey);
    const { monthDay } = formatDayLabel(targetKey);
    toast(`moved to ${monthDay}`, {
      action: fromDayKey
        ? {
            label: 'undo',
            onAction: () => { void moveTaskToDay(task.id, fromDayKey); },
          }
        : undefined,
    });
  }

  // Mirror the regular task menu: absolute destinations relative to actual
  // today, minus the day being viewed and the task's own day, with the
  // friday/tomorrow dedupe applied.
  const todayK = todayKey();
  const tomorrowK = addDays(todayK, 1);
  const fridayK = nextWeekday(todayK, 5);
  const moveOptions = task.day_key
    ? [
        { label: 'yesterday', key: addDays(todayK, -1) },
        { label: 'today',     key: todayK },
        { label: 'tomorrow',  key: tomorrowK },
        ...(fridayK === tomorrowK ? [] : [{ label: 'friday', key: fridayK }]),
      ].filter((opt) => opt.key !== currentDayKey && opt.key !== task.day_key)
    : [];

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
          <SlotMenuItem onClick={() => { close(); openEditor(task.id); }}>
            edit
          </SlotMenuItem>
          <SlotMenuItem
            onClick={() => {
              close();
              void duplicateTask(task.id).then(() => toastSuccess('duplicated'));
            }}
          >
            duplicate
          </SlotMenuItem>
          <SlotMenuItem
            onClick={() => setShowMoveSubmenu((v) => !v)}
          >
            move to day ▸
          </SlotMenuItem>
          {showMoveSubmenu && (
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 2, paddingTop: 2 }}>
              {moveOptions.length === 0 ? (
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    color: 'var(--ink-faint)',
                    fontStyle: 'italic',
                  }}
                >
                  nowhere to move
                </div>
              ) : (
                moveOptions.map((opt) => (
                  <SlotMenuItem key={opt.key} onClick={() => void handleMoveTo(opt.key)}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>{opt.label}</span>
                      <span className="num" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                        {opt.key.slice(5)}
                      </span>
                    </span>
                  </SlotMenuItem>
                ))
              )}
            </div>
          )}
          <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
          <SlotMenuItem danger onClick={handleDelete}>
            delete
          </SlotMenuItem>
        </div>
      )}
    </div>
  );
}

// ── Inline R3 subtask checklist ───────────────────────────────────────

interface R3SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

function R3SubtaskList({ taskId, subtasks }: R3SubtaskListProps) {
  async function toggle(id: string) {
    const next = subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    await updateTask(taskId, { subtasks: next });
  }

  return (
    <div className="col" style={{ gap: 2, marginTop: 6 }}>
      {subtasks.map((s) => (
        <button
          key={s.id}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); void toggle(s.id); }}
          className="row items-center hover:bg-paper-warm transition-colors"
          style={{
            gap: 6,
            padding: '1px 4px',
            borderRadius: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              border: '1.5px solid',
              borderColor: s.done ? 'var(--sage-deep)' : 'var(--ink-faint)',
              borderRadius: 3,
              background: s.done ? 'var(--sage-deep)' : 'transparent',
              color: 'var(--paper)',
              fontSize: 9,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {s.done ? '✓' : ''}
          </span>
          <span
            className={cn('hand', s.done && 'strike')}
            style={{
              fontSize: 13,
              lineHeight: 1.2,
              color: s.done ? 'var(--ink-faint)' : 'var(--ink)',
            }}
          >
            {s.title}
          </span>
        </button>
      ))}
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
