'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';
import { formatDayLabel } from '@/lib/time/dayKey';

interface Props {
  userId: string;
}

/** Global task search — looks across both open and done tasks for the user,
 *  filters by title / description / completion note, jumps to the task's
 *  scheduled day on click. */
export function TaskSearchModal({ userId }: Props) {
  const open = useUiStore((s) => s.taskSearchOpen);
  const setOpen = useUiStore((s) => s.setTaskSearchOpen);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);
  const setView = useUiStore((s) => s.setView);

  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

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
        // Most-recent first (by scheduled day, then updated_at).
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
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => jumpTo(t)}
                  className="row items-center hover:bg-paper-warm transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 8px',
                    borderRadius: 5,
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
              );
            })
          )}
        </div>

        <span
          className="tiny"
          style={{ color: 'var(--ink-faint)', alignSelf: 'flex-start' }}
        >
          {results.length > 0 && `${results.length} match${results.length === 1 ? '' : 'es'} · esc to close`}
        </span>
      </div>
    </div>
  );
}
