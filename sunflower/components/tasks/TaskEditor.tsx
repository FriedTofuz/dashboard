'use client';

import { useState } from 'react';
import { createTask, updateTask } from '@/lib/idb/tasks';
import { useUiStore } from '@/lib/store/useUiStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { cn } from '@/lib/utils';

interface TaskEditorProps {
  userId: string;
}

export function TaskEditor({ userId }: TaskEditorProps) {
  const { isEditorOpen, editingTaskId, currentDayKey, closeEditor } = useUiStore();

  const existingTask = useLiveQuery(
    () => (editingTaskId ? getDb().tasks.get(editingTaskId) : undefined),
    [editingTaskId],
  );

  const [title, setTitle] = useState('');
  const [est, setEst] = useState('25');
  const [desc, setDesc] = useState('');

  // Reset form when editor opens
  if (isEditorOpen && editingTaskId && existingTask && title === '') {
    setTitle(existingTask.title);
    setEst(String(existingTask.est_minutes));
    setDesc(existingTask.description ?? '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const estVal = parseInt(est, 10);
    if (isNaN(estVal) || estVal <= 0) return;

    if (editingTaskId) {
      await updateTask(editingTaskId, {
        title: title.trim(),
        est_minutes: estVal,
        description: desc || undefined,
      });
    } else {
      await createTask(
        {
          day_key: currentDayKey,
          template_id: null,
          title: title.trim(),
          est_minutes: estVal,
          description: desc || undefined,
          state: 'open',
          started_at: null,
          elapsed_ms: 0,
          actual_ms: null,
          completed_at: null,
          r3_slot: null,
          sort_order: Date.now(),
          skipped: false,
          archived: false,
        },
        userId,
      );
    }

    setTitle('');
    setEst('25');
    setDesc('');
    closeEditor();
  }

  function handleClose() {
    setTitle('');
    setEst('25');
    setDesc('');
    closeEditor();
  }

  if (!isEditorOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(43,38,34,0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="paper ink-box-soft col gap-4 p-6 w-full max-w-md rounded-card"
      >
        <h2 className="font-hand text-h3">
          {editingTaskId ? 'edit task' : 'new task'}
        </h2>

        <div className="col gap-1">
          <label className="tiny">task</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what needs doing?"
            autoFocus
            required
            className={cn(
              'font-hand text-body bg-transparent border-b border-ink-faint py-1',
              'focus:outline-none focus:border-ink',
              'placeholder:text-ink-faint',
            )}
          />
        </div>

        <div className="col gap-1">
          <label className="tiny">estimate (minutes)</label>
          <input
            type="number"
            value={est}
            onChange={(e) => setEst(e.target.value)}
            min="1"
            required
            className={cn(
              'font-hand text-body bg-transparent border-b border-ink-faint py-1 w-24',
              'focus:outline-none focus:border-ink',
            )}
          />
        </div>

        <div className="col gap-1">
          <label className="tiny">notes (optional)</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="sub-tasks, phone numbers, details…"
            rows={3}
            className={cn(
              'font-hand text-body-sm bg-transparent border border-ink-faint rounded-input p-2',
              'focus:outline-none focus:border-ink resize-none',
              'placeholder:text-ink-faint',
            )}
          />
        </div>

        <div className="row gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="font-hand text-body muted hover:text-ink transition-colors"
          >
            cancel
          </button>
          <button
            type="submit"
            className="ink-box font-hand text-body px-4 py-1.5 hover:bg-sage-wash transition-colors"
          >
            {editingTaskId ? 'save' : 'add task'}
          </button>
        </div>
      </form>
    </div>
  );
}
