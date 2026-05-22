'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { HandCheckbox } from '@/components/ui/HandCheckbox';
import { elapsedLabel, addDays, formatDayLabel, nextWeekday, todayKey } from '@/lib/time/dayKey';
import {
  uncompleteTask,
  startTimer,
  pauseTimer,
  skipTask,
  deleteTask,
  duplicateTask,
  moveTaskToDay,
  updateTask,
  createTask,
} from '@/lib/idb/tasks';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { promptMoveTask } from '@/lib/store/useMoveTaskStore';
import { LabelChips } from '@/components/labels/LabelChips';
import { renderRichText } from '@/lib/richText';
import type { Subtask, Task } from '@/lib/idb/db';

interface TaskRowProps {
  task: Task;
  index?: number;
  showNumber?: boolean;
  draggable?: boolean;
  showSkip?: boolean;
  /** When true, this task originally belonged to a previous day and is being
   *  surfaced on today's list. Renders a date chip and routes single-click to
   *  the move-to-day prompt. */
  carryover?: boolean;
}

export function TaskRow({
  task,
  index,
  showNumber = true,
  draggable = true,
  showSkip = false,
  carryover = false,
}: TaskRowProps) {
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const tickMs = useTimerStore((s) => s.tickMs);
  const openEditor = useUiStore((s) => s.openEditor);
  const requestCompletion = useUiStore((s) => s.requestCompletion);
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

  function handleRowClick(e: React.MouseEvent) {
    if (!carryover || !task.day_key) return;
    // Don't override double-click or interactions on inner controls.
    if (e.detail > 1) return;
    promptMoveTask({
      taskId: task.id,
      taskTitle: task.title,
      fromDayKey: task.day_key,
    });
  }

  const checkState =
    task.state === 'done' ? 'done' : task.state === 'running' ? 'running' : 'open';

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  // ── Inline-edit estimate ─────────────────────────────────────────────
  const [editingEst, setEditingEst] = useState(false);
  const [estDraft, setEstDraft] = useState(String(task.est_minutes));
  const estInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingEst) {
      estInputRef.current?.focus();
      estInputRef.current?.select();
    }
  }, [editingEst]);

  async function commitEst() {
    const v = parseInt(estDraft, 10);
    if (!isNaN(v) && v > 0 && v !== task.est_minutes) {
      await updateTask(task.id, { est_minutes: v });
    } else {
      setEstDraft(String(task.est_minutes));
    }
    setEditingEst(false);
  }

  const carryFromLabel =
    carryover && task.day_key ? formatDayLabel(task.day_key).monthDay : null;

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ ...style }}
      {...sortable.attributes}
      className={cn(
        'group flex flex-col py-1',
        task.state === 'done' && 'opacity-80',
        task.skipped && 'opacity-50',
      )}
    >
      {/* ── Top row: all primary controls aligned on one line ─────────── */}
      <div
        className="flex items-center gap-3 min-w-0"
        style={{ minHeight: 28, cursor: carryover ? 'pointer' : undefined }}
        onClick={carryover ? handleRowClick : undefined}
      >
        {showNumber && index !== undefined && (
          <span className="num-prefix">{index + 1}.</span>
        )}

        <span style={{ flexShrink: 0 }}>
          <HandCheckbox state={checkState} onClick={handleCheck} />
        </span>

        <div
          className={cn(
            'flex-1 min-w-0 flex items-center gap-3',
            !carryover && task.state !== 'done' && draggable && 'cursor-grab active:cursor-grabbing',
          )}
          {...(draggable && !carryover && task.state !== 'done' ? sortable.listeners : {})}
          onDoubleClick={() => openEditor(task.id)}
        >
          <span
            className={cn(
              'task-label min-w-0',
              (task.state === 'done' || task.skipped) && 'strike',
            )}
            style={{ flex: '1 1 auto' }}
          >
            {task.title}
            {task.subtasks && task.subtasks.length > 0 && (
              <span
                className="ui muted"
                style={{
                  fontSize: 12,
                  marginLeft: 8,
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </span>
            )}
          </span>

          {carryFromLabel && (
            <span
              className="ui shrink-0"
              title={`originally scheduled ${carryFromLabel} — click to move`}
              style={{
                fontSize: 11,
                letterSpacing: '0.06em',
                fontWeight: 600,
                color: 'var(--terra-deep)',
                background: 'var(--terra-tint)',
                border: '1px solid var(--terra-deep)',
                borderRadius: 999,
                padding: '1px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              from {carryFromLabel}
            </span>
          )}

          {(task.start_time || task.end_time) && (
            <span
              className="mono num muted shrink-0"
              style={{ fontSize: 11, letterSpacing: '0.04em' }}
              title="scheduled time"
            >
              {task.start_time ?? '…'}{task.end_time ? `–${task.end_time}` : ''}
            </span>
          )}

          <LabelChips taskId={task.id} size="sm" />

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
          ) : editingEst ? (
            <span className="row items-center shrink-0" style={{ gap: 4 }}>
              <span className="hand" style={{ fontSize: 17, color: 'var(--ink-faint)' }}>—</span>
              <input
                ref={estInputRef}
                type="number"
                min={1}
                value={estDraft}
                onChange={(e) => setEstDraft(e.target.value)}
                onBlur={() => void commitEst()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void commitEst(); }
                  if (e.key === 'Escape') { setEstDraft(String(task.est_minutes)); setEditingEst(false); }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="ui num"
                style={{
                  width: 52,
                  border: '1.5px solid var(--ink-soft)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  textAlign: 'right',
                  outline: 'none',
                }}
                aria-label="Estimated minutes"
              />
              <span className="hand" style={{ fontSize: 17, color: 'var(--ink-faint)' }}>min</span>
            </span>
          ) : task.state === 'paused' && task.elapsed_ms > 0 ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setEditingEst(true); }}
              className="hand num shrink-0 hover:bg-paper-warm transition-colors"
              style={{
                fontSize: 17,
                color: 'var(--ink-faint)',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 4,
                padding: '0 4px',
                cursor: 'text',
              }}
              title="Paused · click to edit estimate"
            >
              — {Math.round(task.elapsed_ms / 60000)}m/{task.est_minutes}m
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setEditingEst(true); }}
              className="hand num shrink-0 hover:bg-paper-warm transition-colors"
              style={{
                fontSize: 17,
                color: 'var(--ink-faint)',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 4,
                padding: '0 4px',
                cursor: 'text',
              }}
              title="Click to edit estimate"
            >
              — {task.est_minutes}min
            </button>
          )}
        </div>

        {/* Trailing controls — aligned with title via items-center on parent */}
        <TaskActionMenu task={task} />

        {showSkip && task.state !== 'done' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void skipTask(task.id, !task.skipped); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="tiny opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-label={task.skipped ? 'Unskip' : 'Skip today'}
          >
            {task.skipped ? '↺ unskip' : 'skip'}
          </button>
        )}

        {task.state !== 'done' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void handleTimer(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-1 py-0.5',
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

      {/* ── Inline description with clickable links ─────────────────── */}
      {task.description && task.state !== 'running' && (
        <p
          className="hand"
          style={{
            fontSize: 13,
            color: 'var(--ink-faint)',
            lineHeight: 1.3,
            margin: '2px 0 0',
            paddingLeft: showNumber ? 56 : 28,
            whiteSpace: 'pre-line',
          }}
        >
          {renderRichText(task.description)}
        </p>
      )}

      {/* Subtask checklist — quick toggle of each item */}
      {task.subtasks && task.subtasks.length > 0 && (
        <SubtaskList
          taskId={task.id}
          subtasks={task.subtasks}
          paddingLeft={showNumber ? 56 : 28}
        />
      )}

      {/* Completion note shown on done tasks */}
      {task.state === 'done' && task.completion_note && (
        <p
          className="hand"
          style={{
            fontSize: 14,
            color: 'var(--ink-faint)',
            fontStyle: 'italic',
            margin: '2px 0 0',
            paddingLeft: showNumber ? 56 : 28,
            whiteSpace: 'pre-line',
          }}
        >
          ⤷ {renderRichText(task.completion_note)}
        </p>
      )}
    </div>
  );
}

// ── Action menu (duplicate / move-to-day / delete) ────────────────────

interface TaskActionMenuProps {
  task: Task;
}

export function TaskActionMenu({ task }: TaskActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openEditor = useUiStore((s) => s.openEditor);
  const currentDayKey = useUiStore((s) => s.currentDayKey);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setShowMoveSubmenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 180;
    setMenuPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    });
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

  async function handleDuplicate() {
    close();
    await duplicateTask(task.id);
    toastSuccess('duplicated');
  }

  async function handleMoveTo(dayKey: string) {
    close();
    const fromDayKey = task.day_key;
    await moveTaskToDay(task.id, dayKey);
    const { monthDay } = formatDayLabel(dayKey);
    toast(`moved to ${monthDay}`, {
      action: fromDayKey
        ? {
            label: 'undo',
            onAction: () => { void moveTaskToDay(task.id, fromDayKey); },
          }
        : undefined,
    });
  }

  // Destinations are absolute (real yesterday / today / tomorrow / friday),
  // not relative to the task's current day — "move to tomorrow" always means
  // actual tomorrow. Hide options whose destination matches the day the user
  // is viewing or the task's current day (those would be no-ops).
  const todayK = todayKey();
  const moveOptions = task.day_key
    ? [
        { label: 'yesterday', key: addDays(todayK, -1) },
        { label: 'today',     key: todayK },
        { label: 'tomorrow',  key: addDays(todayK, 1) },
        { label: 'friday',    key: nextWeekday(todayK, 5) },
      ].filter((opt) => opt.key !== currentDayKey && opt.key !== task.day_key)
    : [];

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
          open && 'opacity-100',
        )}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-faint)',
          fontSize: 18,
          padding: '0 6px',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Task actions"
      >
        ⋯
      </button>

      {open && menuPos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: 4,
            minWidth: 180,
            boxShadow: 'var(--shadow)',
            zIndex: 1000,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: 13,
          }}
        >
          <MenuItem onClick={() => { close(); openEditor(task.id); }}>edit</MenuItem>
          <MenuItem onClick={handleDuplicate}>duplicate</MenuItem>
          <MenuItem
            onClick={() => setShowMoveSubmenu((v) => !v)}
            aria-expanded={showMoveSubmenu}
          >
            move to day ▸
          </MenuItem>
          {showMoveSubmenu && (
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 2, paddingTop: 2 }}>
              {moveOptions.map((opt) => (
                <MenuItem key={opt.key} onClick={() => void handleMoveTo(opt.key)}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{opt.label}</span>
                    <span className="num" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                      {opt.key.slice(5)}
                    </span>
                  </span>
                </MenuItem>
              ))}
            </div>
          )}
          <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
          <MenuItem onClick={handleDelete} danger>delete</MenuItem>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Inline subtask checklist ──────────────────────────────────────────

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  paddingLeft?: number;
}

function SubtaskList({ taskId, subtasks, paddingLeft = 28 }: SubtaskListProps) {
  async function toggle(id: string) {
    const next = subtasks.map((s) =>
      s.id === id ? { ...s, done: !s.done } : s,
    );
    await updateTask(taskId, { subtasks: next });
  }

  return (
    <div
      className="col"
      style={{ gap: 2, marginTop: 4, paddingLeft }}
    >
      {subtasks.map((s) => (
        <button
          key={s.id}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); void toggle(s.id); }}
          className="row items-center hover:bg-paper-warm transition-colors"
          style={{
            gap: 8,
            padding: '2px 6px',
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
              width: 14,
              height: 14,
              border: '1.5px solid',
              borderColor: s.done ? 'var(--sage-deep)' : 'var(--ink-faint)',
              borderRadius: 3,
              background: s.done ? 'var(--sage-deep)' : 'transparent',
              color: 'var(--paper)',
              fontSize: 10,
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
              lineHeight: 1.25,
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

function MenuItem({
  children, onClick, danger, ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
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
      {...rest}
    >
      {children}
    </button>
  );
}
