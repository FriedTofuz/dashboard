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

  const isEmpty =
    ql.length === 0 &&
    matchingTasks.length === 0 &&
    matchingPages.length === 0 &&
    (days ?? []).length === 0;

  return (
    <div
      className="col"
      style={{ gap: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}
    >
      <div className="row items-center justify-between">
        <h2
          className="hand"
          style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, margin: 0 }}
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
              {ql.length === 0 ? 'Recent completions' : `Tasks (${matchingTasks.length})`}
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
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (t.day_key) {
                      setCurrentDayKey(t.day_key);
                      setView('today');
                    }
                  }}
                  className="row items-center justify-between hover:bg-paper-warm transition-colors"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 5,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    className={cn(
                      'hand',
                      t.state === 'done' && 'strike opacity-80',
                    )}
                    style={{ fontSize: 20 }}
                  >
                    {t.title}
                  </span>
                  <span className="tiny num">{t.day_key ?? 'backlog'}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
