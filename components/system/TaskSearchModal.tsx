'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Label, type Task } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';
import { addDays, formatDayLabel, nextWeekday, todayKey } from '@/lib/time/dayKey';
import { deleteTask, moveTaskToDay } from '@/lib/idb/tasks';
import {
  assignLabelToTasks,
  createLabel,
  LABEL_COLOR_PRESETS,
} from '@/lib/idb/labels';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast } from '@/lib/store/useToastStore';

interface Props {
  userId: string;
}

interface MoveChoice {
  label: string;
  dayKey: string;
}

/** Global task search — looks across both open and done tasks for the user,
 *  filters by title / description / completion note, jumps to the task's
 *  scheduled day on click. Supports multi-select with bulk delete / move. */
export function TaskSearchModal({ userId }: Props) {
  const open = useUiStore((s) => s.taskSearchOpen);
  const setOpen = useUiStore((s) => s.setTaskSearchOpen);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);
  const setView = useUiStore((s) => s.setView);
  const currentDayKey = useUiStore((s) => s.currentDayKey);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = useLiveQuery(
    () =>
      open
        ? getDb().labels.where('user_id').equals(userId).sortBy('name')
        : Promise.resolve([] as Label[]),
    [userId, open],
    [],
  );

  const tasks = useLiveQuery(
    () =>
      open
        ? getDb()
            .tasks.where('user_id')
            .equals(userId)
            .filter((t) => !t.archived)
            .toArray()
        : Promise.resolve([] as Task[]),
    [userId, open],
    [],
  );

  useEffect(() => {
    if (!open) {
      setQ('');
      setSelected(new Set());
      setShowMoveMenu(false);
      setShowLabelMenu(false);
      setNewLabelName('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoveMenu) {
          setShowMoveMenu(false);
        } else if (showLabelMenu) {
          setShowLabelMenu(false);
        } else {
          e.preventDefault();
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen, showMoveMenu, showLabelMenu]);

  const results = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (ql.length === 0) return [] as Task[];
    return (tasks ?? [])
      .filter(
        (t) =>
          t.title.toLowerCase().includes(ql) ||
          (t.description ?? '').toLowerCase().includes(ql) ||
          (t.completion_note ?? '').toLowerCase().includes(ql),
      )
      .sort((a, b) => {
        const ak = a.day_key ?? '';
        const bk = b.day_key ?? '';
        if (ak !== bk) return bk.localeCompare(ak);
        return b.updated_at - a.updated_at;
      })
      .slice(0, 50);
  }, [tasks, q]);

  if (!open) return null;

  function jumpTo(task: Task) {
    if (task.day_key) {
      setCurrentDayKey(task.day_key);
      setView('today');
    }
    setOpen(false);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllResults() {
    setSelected(new Set(results.map((t) => t.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ok = await themedConfirm({
      title: `delete ${selected.size} task${selected.size === 1 ? '' : 's'}?`,
      body: 'this can\'t be undone.',
      confirmLabel: 'delete all',
      cancelLabel: 'keep them',
      danger: true,
    });
    if (!ok) return;
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => deleteTask(id)));
    toast(`deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`);
    setSelected(new Set());
  }

  async function bulkMove(dayKey: string) {
    if (selected.size === 0) return;
    setShowMoveMenu(false);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => moveTaskToDay(id, dayKey)));
    const { monthDay } = formatDayLabel(dayKey);
    toast(`moved ${ids.length} task${ids.length === 1 ? '' : 's'} to ${monthDay}`);
    setSelected(new Set());
  }

  async function bulkAddLabel(labelId: string, labelName: string) {
    if (selected.size === 0) return;
    setShowLabelMenu(false);
    const ids = Array.from(selected);
    await assignLabelToTasks(ids, labelId, userId);
    toast(`labeled ${ids.length} task${ids.length === 1 ? '' : 's'} "${labelName}"`);
    // Keep the selection so the user can chain more bulk actions.
  }

  async function bulkCreateAndAddLabel() {
    const name = newLabelName.trim();
    if (!name || selected.size === 0) return;
    const sortOrder = (labels ?? []).length;
    const color = LABEL_COLOR_PRESETS[sortOrder % LABEL_COLOR_PRESETS.length];
    const id = await createLabel({ name, color, sort_order: sortOrder }, userId);
    await assignLabelToTasks(Array.from(selected), id, userId);
    toast(`created label "${name}" and tagged ${selected.size} task${selected.size === 1 ? '' : 's'}`);
    setNewLabelName('');
    setShowLabelMenu(false);
  }

  const todayK = todayKey();
  const moveChoices: MoveChoice[] = [
    { label: 'yesterday', dayKey: addDays(todayK, -1) },
    { label: 'today',     dayKey: todayK },
    { label: 'tomorrow',  dayKey: addDays(todayK, 1) },
    { label: 'friday',    dayKey: nextWeekday(todayK, 5) },
  ].filter((c) => c.dayKey !== currentDayKey);

  const hasSelection = selected.size > 0;
  const allSelected = results.length > 0 && results.every((t) => selected.has(t.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', paddingTop: '8vh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Search tasks"
    >
      <div
        className="paper ink-box-soft rounded-card col"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '80vh',
          gap: 12,
          padding: 20,
          background: 'var(--paper)',
        }}
      >
        <div className="row items-center" style={{ gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search every task by title, notes, or completion note…"
            className="hand bg-transparent flex-1"
            style={{
              border: 'none',
              borderBottom: '1.5px solid var(--ink-faint)',
              padding: '6px 4px',
              outline: 'none',
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="tiny"
            aria-label="Close search"
          >
            close
          </button>
        </div>

        {/* Bulk action bar — shows whenever any row is selected. */}
        {hasSelection && (
          <div
            className="row items-center"
            style={{
              gap: 10,
              padding: '8px 10px',
              borderRadius: 5,
              background: 'var(--paper-warm, rgba(232, 178, 96, 0.08))',
              border: '1.5px solid var(--ink-soft)',
              position: 'relative',
            }}
          >
            <span className="ui-b" style={{ fontSize: 13, color: 'var(--ink)' }}>
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={() => setShowMoveMenu((v) => !v)}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--ink-soft)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              move to day ▾
            </button>
            {showMoveMenu && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 90,
                  marginTop: 4,
                  background: 'var(--paper)',
                  border: '1.5px solid var(--ink-soft)',
                  borderRadius: 6,
                  padding: 4,
                  minWidth: 180,
                  boxShadow: 'var(--shadow)',
                  zIndex: 60,
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 13,
                }}
              >
                {moveChoices.length === 0 ? (
                  <span
                    className="muted caption italic"
                    style={{ padding: '6px 10px', display: 'block' }}
                  >
                    no other day options
                  </span>
                ) : (
                  moveChoices.map((c) => (
                    <button
                      key={c.dayKey}
                      type="button"
                      role="menuitem"
                      onClick={() => void bulkMove(c.dayKey)}
                      className="hover:bg-paper-warm transition-colors"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        font: 'inherit',
                        gap: 12,
                      }}
                    >
                      <span>{c.label}</span>
                      <span className="num" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                        {c.dayKey.slice(5)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setShowLabelMenu((v) => !v); setShowMoveMenu(false); }}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--ink-soft)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              add label ▾
            </button>
            {showLabelMenu && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 200,
                  marginTop: 4,
                  background: 'var(--paper)',
                  border: '1.5px solid var(--ink-soft)',
                  borderRadius: 6,
                  padding: 6,
                  minWidth: 220,
                  boxShadow: 'var(--shadow)',
                  zIndex: 60,
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {(labels ?? []).length === 0 && (
                  <span
                    className="muted caption italic"
                    style={{ padding: '4px 6px' }}
                  >
                    no labels yet — create one below
                  </span>
                )}
                {(labels ?? []).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void bulkAddLabel(l.id, l.name)}
                    className="row items-center hover:bg-paper-warm transition-colors"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '5px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 8,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: l.color,
                        border: '1px solid var(--ink-soft)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>{l.name}</span>
                  </button>
                ))}
                <div
                  style={{
                    borderTop: '1px solid var(--rule)',
                    marginTop: 4,
                    paddingTop: 6,
                  }}
                >
                  <div className="row items-center" style={{ gap: 6 }}>
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void bulkCreateAndAddLabel();
                        }
                      }}
                      placeholder="+ new label name"
                      className="hand bg-transparent flex-1"
                      style={{
                        border: 'none',
                        borderBottom: '1px solid var(--ink-faint)',
                        padding: '2px 4px',
                        outline: 'none',
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void bulkCreateAndAddLabel()}
                      disabled={!newLabelName.trim()}
                      className="ui hover:bg-paper-warm transition-colors disabled:opacity-50"
                      style={{
                        border: '1.5px solid var(--ink-soft)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        cursor: newLabelName.trim() ? 'pointer' : 'default',
                        fontSize: 11,
                      }}
                    >
                      create
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => void bulkDelete()}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--terra-deep)',
                background: 'transparent',
                color: 'var(--terra-deep)',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="tiny"
              style={{ marginLeft: 'auto' }}
              aria-label="Clear selection"
            >
              clear
            </button>
          </div>
        )}

        {/* Select-all toggle, visible whenever there are results. */}
        {results.length > 0 && (
          <button
            type="button"
            onClick={allSelected ? clearSelection : selectAllResults}
            className="tiny hover:bg-paper-warm transition-colors"
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              padding: '2px 6px',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {allSelected ? 'clear all' : `select all ${results.length}`}
          </button>
        )}

        <div
          className="col"
          style={{ gap: 2, overflowY: 'auto', minHeight: 0, flex: 1 }}
        >
          {q.trim().length === 0 ? (
            <p className="muted caption italic">
              type to search across all tasks (open + done)
            </p>
          ) : results.length === 0 ? (
            <p className="muted caption italic">no matches</p>
          ) : (
            results.map((t) => {
              const day = t.day_key ? formatDayLabel(t.day_key).monthDay : 'backlog';
              const isSel = selected.has(t.id);
              return (
                <div
                  key={t.id}
                  className="row items-center hover:bg-paper-warm transition-colors"
                  style={{
                    padding: '6px 8px',
                    borderRadius: 5,
                    gap: 10,
                    background: isSel ? 'var(--sage-wash, rgba(107, 138, 92, 0.10))' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelected(t.id)}
                    aria-label={`Select ${t.title}`}
                    style={{ flexShrink: 0, cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    onClick={() => jumpTo(t)}
                    className="row items-center flex-1 min-w-0"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 12,
                    }}
                  >
                    <span
                      className="hand flex-1"
                      style={{
                        fontSize: 17,
                        lineHeight: 1.2,
                        color: t.state === 'done' ? 'var(--ink-faint)' : 'var(--ink)',
                        textDecoration: t.state === 'done' ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {t.title}
                    </span>
                    {t.r3_slot != null && (
                      <span
                        className="ui-b"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--sage-deep)',
                        }}
                      >
                        R3·{t.r3_slot}
                      </span>
                    )}
                    <span
                      className="tiny num"
                      style={{ flexShrink: 0, color: 'var(--ink-faint)' }}
                    >
                      {day}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <span
          className="tiny"
          style={{ color: 'var(--ink-faint)', alignSelf: 'flex-start' }}
        >
          {results.length > 0
            ? `${results.length} match${results.length === 1 ? '' : 'es'} · click to jump · check to bulk-edit · esc to close`
            : ''}
        </span>
      </div>
    </div>
  );
}
