'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { startTimer } from '@/lib/idb/tasks';
import { enablePushNotifications, disablePushNotifications } from '@/lib/pwa/push';
import { useUiStore } from '@/lib/store/useUiStore';
import { todayKey } from '@/lib/time/dayKey';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  action: () => void;
}

export function CommandPalette({ userId }: Props) {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const openEditor = useUiStore((s) => s.openEditor);
  const setHabitsEditorOpen = useUiStore((s) => s.setHabitsEditorOpen);
  const setView = useUiStore((s) => s.setView);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);

  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('user_id')
        .equals(userId)
        .filter((t) => !t.archived && t.state !== 'done')
        .limit(50)
        .toArray(),
    [userId],
    [],
  );

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const builtin: Cmd[] = [
    { id: 'new-task', label: 'new task', hint: 'n', action: () => openEditor() },
    { id: 'habits', label: 'manage habits', action: () => setHabitsEditorOpen(true) },
    { id: 'view-today', label: 'go to today', action: () => { setView('today'); setCurrentDayKey(todayKey()); } },
    { id: 'view-range', label: 'range view', action: () => setView('range') },
    { id: 'view-archive', label: 'archive', action: () => setView('archive') },
    {
      id: 'push-enable',
      label: 'enable push notifications',
      action: async () => {
        const result = await enablePushNotifications();
        alert(result.ok ? 'notifications enabled' : `failed: ${result.reason}`);
      },
    },
    {
      id: 'push-disable',
      label: 'disable push notifications',
      action: async () => {
        await disablePushNotifications();
        alert('notifications disabled');
      },
    },
    {
      id: 'export-json',
      label: 'export all data (JSON)',
      action: () => window.open('/api/export', '_blank'),
    },
    {
      id: 'sign-out',
      label: 'sign out',
      action: async () => {
        await fetch('/auth/sign-out', { method: 'POST' });
        window.location.href = '/login';
      },
    },
  ];

  const ql = q.toLowerCase().trim();
  const filteredBuiltin = builtin.filter((c) => c.label.toLowerCase().includes(ql));
  const filteredTasks =
    ql.length === 0
      ? []
      : (tasks ?? [])
          .filter((t) => t.title.toLowerCase().includes(ql))
          .slice(0, 6)
          .map((t) => ({
            id: `task-${t.id}`,
            label: `▸ start "${t.title}"`,
            hint: t.r3_slot ? `R3·${t.r3_slot}` : `${t.est_minutes}m`,
            action: () => void startTimer(t.id),
          }));

  const cmds = [...filteredBuiltin, ...filteredTasks];
  const clampedSel = Math.min(sel, Math.max(0, cmds.length - 1));

  function run(c: Cmd) {
    c.action();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="ink-box paper rounded-card w-full max-w-md col gap-1 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, cmds.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); const c = cmds[clampedSel]; if (c) run(c); }
            else if (e.key === 'Escape') { setOpen(false); }
          }}
          placeholder="search tasks, commands…"
          className="font-hand text-body bg-transparent px-3 py-2 border-b focus:outline-none"
          style={{ borderColor: 'var(--ink-faint)' }}
        />

        <div className="col gap-0 py-1 max-h-[50vh] overflow-y-auto">
          {cmds.length === 0 && (
            <p className="muted caption italic px-3 py-2">no matches</p>
          )}
          {cmds.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setSel(i)}
              onClick={() => run(c)}
              className={cn(
                'row items-center justify-between px-3 py-1.5 rounded-card text-left font-hand text-body-sm',
                i === clampedSel && 'wash-sage',
              )}
            >
              <span>{c.label}</span>
              {c.hint && <span className="tiny">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
