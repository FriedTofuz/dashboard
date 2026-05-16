'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';
import { formatDayLabel } from '@/lib/time/dayKey';

interface Props {
  userId: string;
}

export function ArchiveView({ userId }: Props) {
  const [q, setQ] = useState('');
  const setView = useUiStore((s) => s.setView);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);

  const allTasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('user_id')
        .equals(userId)
        .toArray(),
    [userId],
    [],
  );

  const pages = useLiveQuery(
    () =>
      getDb()
        .notepad_pages.where('user_id')
        .equals(userId)
        .toArray(),
    [userId],
    [],
  );

  const days = useLiveQuery(
    () =>
      getDb()
        .days.where('user_id')
        .equals(userId)
        .toArray(),
    [userId],
    [],
  );

  const ql = q.toLowerCase().trim();

  const matchingTasks = useMemo(() => {
    if (ql.length === 0) {
      return (allTasks ?? []).filter((t) => t.state === 'done').slice(0, 50);
    }
    return (allTasks ?? [])
      .filter(
        (t) =>
          t.title.toLowerCase().includes(ql) ||
          (t.description ?? '').toLowerCase().includes(ql) ||
          (t.completion_note ?? '').toLowerCase().includes(ql),
      )
      .slice(0, 100);
  }, [allTasks, ql]);

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

  return (
    <div className="col gap-4 max-w-3xl mx-auto">
      <div className="row items-center justify-between">
        <h2 className="font-hand text-h2">
          <span className="underline-hand">archive</span>
        </h2>
        <button
          type="button"
          onClick={() => setView('today')}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
        >
          back to today
        </button>
      </div>

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search tasks, notes, pages…"
        className="font-hand text-body bg-transparent border-b py-2 px-1 focus:outline-none"
        style={{ borderColor: 'var(--ink-faint)' }}
        autoFocus
      />

      {ql.length > 0 && matchingDays.length > 0 && (
        <div className="col gap-2">
          <h3 className="tiny text-sage-deep">day notes</h3>
          {matchingDays.map((d) => (
            <button
              key={`${d.user_id}_${d.day_key}`}
              type="button"
              onClick={() => {
                setCurrentDayKey(d.day_key);
                setView('today');
              }}
              className="paper ink-box-soft rounded-card p-3 text-left hover:wash-sage transition-colors"
            >
              <div className="row items-center justify-between mb-1">
                <span className="font-hand text-body-sm">
                  {formatDayLabel(d.day_key).monthDay}
                </span>
                <span className="tiny">{d.day_key}</span>
              </div>
              <p className="font-hand text-body-sm muted whitespace-pre-line line-clamp-3">
                {d.notes}
              </p>
            </button>
          ))}
        </div>
      )}

      {matchingPages.length > 0 && (
        <div className="col gap-2">
          <h3 className="tiny text-sage-deep">notepad pages</h3>
          {matchingPages.map((p) => (
            <div
              key={p.id}
              className={cn(
                'paper rounded-card p-3',
                p.archived ? 'ink-box-soft opacity-70' : 'ink-box-sage',
              )}
            >
              <div className="row items-center justify-between mb-1">
                <span className="font-hand text-body">{p.title}</span>
                {p.archived && <span className="tiny">archived</span>}
              </div>
              <p className="font-hand text-body-sm muted whitespace-pre-line line-clamp-3">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="col gap-1">
        <h3 className="tiny text-sage-deep">
          {ql.length === 0 ? 'recent completions' : `tasks (${matchingTasks.length})`}
        </h3>
        {matchingTasks.length === 0 && (
          <p className="muted caption italic">no matches</p>
        )}
        {matchingTasks
          .sort((a, b) => (b.completed_at ?? b.updated_at) - (a.completed_at ?? a.updated_at))
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.day_key) {
                  setCurrentDayKey(t.day_key);
                  setView('today');
                }
              }}
              className="row items-center justify-between py-1.5 px-2 rounded-card hover:wash-sage text-left transition-colors"
            >
              <span
                className={cn(
                  'font-hand text-body',
                  t.state === 'done' && 'strike opacity-70',
                )}
              >
                {t.title}
              </span>
              <span className="tiny">{t.day_key ?? 'backlog'}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
