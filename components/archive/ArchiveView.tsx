'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast } from '@/lib/store/useToastStore';
import { deleteTask, createTask } from '@/lib/idb/tasks';
import { cn } from '@/lib/utils';
import { formatDayLabel } from '@/lib/time/dayKey';
import { LabelChips } from '@/components/labels/LabelChips';

interface Props {
  userId: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dayKeyToYearMonth(key: string | null | undefined): { year: number; month: number } | null {
  if (!key) return null;
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
}

type StateFilter = 'done' | 'open' | 'all';

export function ArchiveView({ userId }: Props) {
  const [q, setQ] = useState('');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterLabel, setFilterLabel] = useState<string | 'all'>('all');
  const [filterState, setFilterState] = useState<StateFilter>('done');
  const setView = useUiStore((s) => s.setView);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);
  const openEditor = useUiStore((s) => s.openEditor);
  const setLabelsManagerOpen = useUiStore((s) => s.setLabelsManagerOpen);

  const allTasks = useLiveQuery(
    () => getDb().tasks.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  const labels = useLiveQuery(
    () => getDb().labels.where('user_id').equals(userId).sortBy('name'),
    [userId],
    [],
  );

  const taskLabels = useLiveQuery(
    () => getDb().task_labels.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  // Map task_id -> Set<label_id> for fast filtering.
  const taskIdToLabelIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const tl of taskLabels ?? []) {
      let s = m.get(tl.task_id);
      if (!s) { s = new Set(); m.set(tl.task_id, s); }
      s.add(tl.label_id);
    }
    return m;
  }, [taskLabels]);

  const pages = useLiveQuery(
    () => getDb().notepad_pages.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  const days = useLiveQuery(
    () => getDb().days.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  const ql = q.toLowerCase().trim();

  // Build year/month lists from tasks for the dropdowns
  const { years, monthsForYear } = useMemo(() => {
    const ys = new Set<number>();
    const ymMap = new Map<number, Set<number>>();
    for (const t of allTasks ?? []) {
      const ym = dayKeyToYearMonth(t.day_key);
      if (!ym) continue;
      ys.add(ym.year);
      let mSet = ymMap.get(ym.year);
      if (!mSet) { mSet = new Set(); ymMap.set(ym.year, mSet); }
      mSet.add(ym.month);
    }
    return {
      years: Array.from(ys).sort((a, b) => b - a),
      monthsForYear: (y: number | 'all'): number[] => {
        if (y === 'all') {
          const all = new Set<number>();
          ymMap.forEach((months) => months.forEach((m) => all.add(m)));
          return Array.from(all).sort((a, b) => a - b);
        }
        return Array.from(ymMap.get(y) ?? []).sort((a, b) => a - b);
      },
    };
  }, [allTasks]);

  // Filter tasks by year/month/label + search query
  const matchingTasks = useMemo(() => {
    const labelMatch = (t: Task) => {
      if (filterLabel === 'all') return true;
      return taskIdToLabelIds.get(t.id)?.has(filterLabel) ?? false;
    };
    const matchesState = (t: Task) => {
      if (filterState === 'all') return true;
      if (filterState === 'done') return t.state === 'done';
      return t.state !== 'done'; // 'open' = any non-done (open/running/paused)
    };
    const list = (allTasks ?? []).filter((t) => {
      // Hide habit instances (live or detached) — archive is for one-off /
      // project work, not the daily template churn.
      if (t.template_id != null) return false;
      if (t.habit_title != null) return false;
      const ym = dayKeyToYearMonth(t.day_key);
      if (filterYear !== 'all' && (!ym || ym.year !== filterYear)) return false;
      if (filterMonth !== 'all' && (!ym || ym.month !== filterMonth)) return false;
      if (!labelMatch(t)) return false;
      if (!matchesState(t)) return false;
      return true;
    });

    const anyFilter =
      filterYear !== 'all' ||
      filterMonth !== 'all' ||
      filterLabel !== 'all' ||
      filterState !== 'done';

    if (ql.length === 0) {
      // Without a search query, cap at 50 unless any filter is engaged.
      const filtered = list.filter((t) => !t.archived);
      return filtered.slice(0, anyFilter ? 200 : 50);
    }
    return list
      .filter(
        (t) =>
          t.title.toLowerCase().includes(ql) ||
          (t.description ?? '').toLowerCase().includes(ql) ||
          (t.completion_note ?? '').toLowerCase().includes(ql),
      )
      .slice(0, 200);
  }, [allTasks, ql, filterYear, filterMonth, filterLabel, filterState, taskIdToLabelIds]);

  const matchingPages = useMemo(
    () =>
      (pages ?? []).filter(
        (p) =>
          p.title.toLowerCase().includes(ql) ||
          p.body.toLowerCase().includes(ql),
      ),
    [pages, ql],
  );

  const matchingDays = useMemo(() => {
    if (ql.length === 0) return [];
    return (days ?? []).filter((d) => d.notes.toLowerCase().includes(ql));
  }, [days, ql]);

  const noFilter =
    ql.length === 0 &&
    filterYear === 'all' &&
    filterMonth === 'all' &&
    filterLabel === 'all' &&
    filterState === 'done';
  const isEmpty =
    noFilter &&
    matchingTasks.length === 0 &&
    matchingPages.length === 0 &&
    (days ?? []).length === 0;

  async function handleDeleteTask(task: Task) {
    const ok = await themedConfirm({
      title: `delete "${task.title}"?`,
      body: 'this removes the task from history. it can\'t be undone.',
      confirmLabel: 'delete',
      cancelLabel: 'keep it',
      danger: true,
    });
    if (!ok) return;
    const snap = { ...task };
    await deleteTask(task.id);
    toast(`deleted "${task.title}"`, {
      action: {
        label: 'undo',
        onAction: () => {
          void createTask(
            {
              day_key: snap.day_key,
              template_id: snap.template_id,
              title: snap.title,
              description: snap.description,
              est_minutes: snap.est_minutes,
              state: snap.state,
              started_at: null,
              elapsed_ms: snap.elapsed_ms,
              actual_ms: snap.actual_ms,
              completed_at: snap.completed_at,
              completion_note: snap.completion_note,
              r3_slot: snap.r3_slot,
              sort_order: snap.sort_order,
              skipped: snap.skipped,
              archived: snap.archived,
            },
            snap.user_id,
          );
        },
      },
    });
  }

  const monthOptions = monthsForYear(filterYear);

  return (
    <div
      className="col"
      style={{ gap: 20, maxWidth: 800, margin: '0 auto', width: '100%' }}
    >
      <div className="row items-center justify-between">
        <h2
          className="hand"
          style={{ fontSize: 28, lineHeight: 1, fontWeight: 600, margin: 0 }}
        >
          <span className="underline-hand">archive</span>
        </h2>
        <button
          type="button"
          onClick={() => setView('today')}
          className="wobble hover:bg-paper-warm transition-colors"
          style={{
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontWeight: 500,
            fontSize: 13,
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 5,
            padding: '8px 14px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            cursor: 'pointer',
            minHeight: 36,
          }}
        >
          back to today
        </button>
      </div>

      <div className="col" style={{ gap: 10 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search tasks, notes, pages…"
          className="hand bg-transparent"
          style={{
            fontSize: 20,
            fontWeight: 500,
            borderBottom: '1px solid var(--ink-faint)',
            padding: '8px 2px',
            outline: 'none',
            color: 'var(--ink)',
          }}
          autoFocus
        />

        <div className="row items-center" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span className="tiny" style={{ letterSpacing: '0.14em' }}>filter</span>
          <FilterDropdown
            label="year"
            value={filterYear === 'all' ? 'all' : String(filterYear)}
            onChange={(v) => {
              setFilterYear(v === 'all' ? 'all' : parseInt(v, 10));
              setFilterMonth('all');
            }}
            options={[
              { value: 'all', label: 'all years' },
              ...years.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
          <FilterDropdown
            label="month"
            value={filterMonth === 'all' ? 'all' : String(filterMonth)}
            onChange={(v) => setFilterMonth(v === 'all' ? 'all' : parseInt(v, 10))}
            options={[
              { value: 'all', label: 'all months' },
              ...monthOptions.map((m) => ({ value: String(m), label: MONTH_NAMES[m - 1] })),
            ]}
          />
          <FilterDropdown
            label="label"
            value={filterLabel}
            onChange={(v) => setFilterLabel(v)}
            options={[
              { value: 'all', label: 'all labels' },
              ...(labels ?? []).map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
          <FilterDropdown
            label="show"
            value={filterState}
            onChange={(v) => setFilterState(v as StateFilter)}
            options={[
              { value: 'done', label: 'finished' },
              { value: 'open', label: 'unfinished' },
              { value: 'all',  label: 'all' },
            ]}
          />
          <button
            type="button"
            onClick={() => setLabelsManagerOpen(true)}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              padding: '6px 8px',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            ⚙
          </button>
          {(filterYear !== 'all' || filterMonth !== 'all' || filterLabel !== 'all' || filterState !== 'done') && (
            <button
              type="button"
              onClick={() => { setFilterYear('all'); setFilterMonth('all'); setFilterLabel('all'); setFilterState('done'); }}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-faint)',
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              clear filter
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <span className="headline">no history yet</span>
          <span className="sub">your first archived day appears tomorrow</span>
        </div>
      ) : (
        <>
          {ql.length > 0 && matchingDays.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <p className="section-head sage">Day notes</p>
              {matchingDays.map((d) => (
                <button
                  key={`${d.user_id}_${d.day_key}`}
                  type="button"
                  onClick={() => {
                    setCurrentDayKey(d.day_key);
                    setView('today');
                  }}
                  className="paper wobble hover:bg-paper-warm transition-colors"
                  style={{
                    border: '1.5px solid var(--ink-soft)',
                    borderRadius: 6,
                    padding: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div className="row items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="hand" style={{ fontSize: 20, fontWeight: 600 }}>
                      {formatDayLabel(d.day_key).monthDay}
                    </span>
                    <span className="tiny num">{d.day_key}</span>
                  </div>
                  <p className="hand muted line-clamp-3" style={{ fontSize: 17, whiteSpace: 'pre-line' }}>
                    {d.notes}
                  </p>
                </button>
              ))}
            </div>
          )}

          {matchingPages.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <p className="section-head sage">Notepad pages</p>
              {matchingPages.map((p) => (
                <div
                  key={p.id}
                  className={cn('paper rounded-card wobble', p.archived && 'opacity-70')}
                  style={{
                    border: p.archived
                      ? '1.5px solid var(--ink-soft)'
                      : '1.6px solid var(--sage-deep)',
                    padding: 14,
                  }}
                >
                  <div className="row items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="hand" style={{ fontSize: 20, fontWeight: 600 }}>
                      {p.title}
                    </span>
                    {p.archived && <span className="tiny">archived</span>}
                  </div>
                  <p className="hand muted line-clamp-3" style={{ fontSize: 17, whiteSpace: 'pre-line' }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="col" style={{ gap: 4 }}>
            <p className="section-head sage">
              {ql.length === 0
                ? filterYear === 'all' && filterMonth === 'all'
                  ? 'Recent completions'
                  : `Tasks (${matchingTasks.length})`
                : `Tasks (${matchingTasks.length})`}
            </p>
            {matchingTasks.length === 0 && (
              <p className="hand muted" style={{ fontSize: 17, fontStyle: 'italic' }}>
                no matches
              </p>
            )}
            {matchingTasks
              .sort(
                (a, b) =>
                  (b.completed_at ?? b.updated_at) - (a.completed_at ?? a.updated_at),
              )
              .map((t) => (
                <ArchiveTaskRow
                  key={t.id}
                  task={t}
                  onOpen={() => {
                    if (t.day_key) {
                      setCurrentDayKey(t.day_key);
                      setView('today');
                    }
                  }}
                  onEdit={() => openEditor(t.id)}
                  onDelete={() => handleDeleteTask(t)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Filter dropdown ────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

function FilterDropdown({ label, value, onChange, options }: FilterDropdownProps) {
  return (
    <label className="row items-center" style={{ gap: 6 }}>
      <span className="ui muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui wobble"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 5,
          padding: '6px 10px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontSize: 13,
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

// ── Archive task row ───────────────────────────────────────────────────

interface ArchiveTaskRowProps {
  task: Task;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ArchiveTaskRow({ task, onOpen, onEdit, onDelete }: ArchiveTaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;
  const subtaskSummary = hasSubtasks
    ? `${task.subtasks!.filter((s) => s.done).length}/${task.subtasks!.length}`
    : null;

  return (
    <div className="col" style={{ gap: 0 }}>
      <div
        className="row items-center group hover:bg-paper-warm transition-colors"
        style={{
          padding: '6px 10px',
          borderRadius: 5,
          gap: 8,
        }}
      >
        {hasSubtasks ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Hide subtasks' : 'Show subtasks'}
            aria-expanded={expanded}
            className="hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              fontSize: 11,
              width: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              cursor: 'pointer',
              flexShrink: 0,
              lineHeight: 1,
              transition: 'transform 0.12s ease',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▸
          </button>
        ) : (
          <span style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden />
        )}
        <button
          type="button"
          onClick={onOpen}
          className="row items-center justify-between flex-1 min-w-0"
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
            className={cn('hand', task.state === 'done' && 'strike opacity-80')}
            style={{ fontSize: 20, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {task.title}
            {subtaskSummary && (
              <span
                className="ui muted"
                style={{
                  fontSize: 12,
                  marginLeft: 8,
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                {subtaskSummary}
              </span>
            )}
          </span>
          <LabelChips taskId={task.id} size="sm" max={3} />
          <span className="tiny num" style={{ flexShrink: 0 }}>
            {task.day_key ?? 'backlog'}
          </span>
        </button>
        <div
          className="row opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          style={{ gap: 2, flexShrink: 0 }}
        >
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit task"
            title="Edit"
            className="hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              fontSize: 14,
              padding: 4,
              borderRadius: 3,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete task"
            title="Delete"
            className="hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--terra-deep)',
              fontSize: 14,
              padding: 4,
              borderRadius: 3,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {hasSubtasks && expanded && (
        <ul
          className="col"
          style={{
            margin: 0,
            padding: '2px 0 6px 38px',
            gap: 2,
            listStyle: 'none',
          }}
        >
          {task.subtasks!.map((s) => (
            <li
              key={s.id}
              className="row items-center"
              style={{ gap: 8, padding: '1px 0' }}
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
                  fontSize: 14,
                  lineHeight: 1.25,
                  color: s.done ? 'var(--ink-faint)' : 'var(--ink)',
                }}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
