'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { HandCheckbox } from '@/components/ui/HandCheckbox';
import { elapsedLabel, addDays, formatDayLabel } from '@/lib/time/dayKey';
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

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ ...style }}
      {...sortable.attributes}
      className={cn(
        'flex items-start gap-3 py-1 group',
        task.state === 'done' && 'opacity-80',
        task.skipped && 'opacity-50',
      )}
    >
      {showNumber && index !== undefined && (
        <span className="num-prefix" style={{ paddingTop: 4 }}>{index + 1}.</span>
      )}

      <span style={{ paddingTop: 4, flexShrink: 0 }}>
        <HandCheckbox state={checkState} onClick={handleCheck} />
      </span>

      <div
        className="flex-1 min-w-0 cursor-grab active:cursor-grabbing col"
        {...(draggable && task.state !== 'done' ? sortable.listeners : {})}
        onDoubleClick={() => openEditor(task.id)}
        style={{ minHeight: 24 }}
      >
        <div className="flex items-center gap-3 min-w-0" style={{ minHeight: 24 }}>
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

        {/* Inline description — small dimmed line under the title */}
        {task.description && task.state !== 'running' && (
          <p
            className="hand"
            style={{
              fontSize: 15,
              color: 'var(--ink-faint)',
              lineHeight: 1.3,
              margin: '2px 0 0',
              whiteSpace: 'pre-line',
            }}
          >
            {task.description}
          </p>
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
              whiteSpace: 'pre-line',
            }}
          >
            ⤷ {task.completion_note}
          </p>
        )}
      </div>

      <TaskActionMenu task={task} />

      {showSkip && task.state !== 'done' && (
        <button
          type="button"
          onClick={() => skipTask(task.id, !task.skipped)}
          className="tiny opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ paddingTop: 4 }}
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
            paddingTop: 4,
          }}
        >
          {task.state === 'running' ? '⏸' : '▸ start'}
        </button>
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
  const ref = useRef<HTMLDivElement>(null);
  const openEditor = useUiStore((s) => s.openEditor);

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

  const today = task.day_key ?? '';
  const moveOptions = today
    ? [
        { label: 'tomorrow',     key: addDays(today, 1) },
        { label: 'in 2 days',    key: addDays(today, 2) },
        { label: 'next week',    key: addDays(today, 7) },
        { label: 'yesterday',    key: addDays(today, -1) },
      ]
    : [];

  return (
    <div ref={ref} style={{ position: 'relative', paddingTop: 2, flexShrink: 0 }}>
      <button
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

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: 4,
            minWidth: 170,
            boxShadow: 'var(--shadow)',
            zIndex: 20,
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
        </div>
      )}
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
