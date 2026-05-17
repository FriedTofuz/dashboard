'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { completeTask } from '@/lib/idb/tasks';
import { useUiStore } from '@/lib/store/useUiStore';

/** Modal that fires when a task is checked off. Asks for an optional note,
 *  then calls completeTask(taskId, note). Skip = complete without note. */
export function CompletionPrompt() {
  const completingTaskId = useUiStore((s) => s.completingTaskId);
  const clearCompletion = useUiStore((s) => s.clearCompletion);

  const task = useLiveQuery(
    () => (completingTaskId ? getDb().tasks.get(completingTaskId) : undefined),
    [completingTaskId],
  );

  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (completingTaskId) {
      setNote('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [completingTaskId]);

  if (!completingTaskId) return null;

  async function finish(saveNote: boolean) {
    if (!completingTaskId) return;
    const trimmed = note.trim();
    await completeTask(completingTaskId, saveNote && trimmed ? trimmed : undefined);
    clearCompletion();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) clearCompletion(); }}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); void finish(true); }}
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          padding: 24,
          width: '100%',
          maxWidth: 460,
          gap: 14,
          background: 'var(--paper)',
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <span className="tiny">marking done</span>
          <h2
            className="hand"
            style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 700, margin: 0 }}
          >
            {task?.title ?? '…'}
          </h2>
        </div>

        <div className="col" style={{ gap: 4 }}>
          <label className="tiny" htmlFor="completion-note">how did it go? (optional)</label>
          <textarea
            id="completion-note"
            ref={inputRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="what shipped · what's left · what surprised you"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void finish(true);
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                clearCompletion();
              }
            }}
            className="hand wobble"
            style={{
              fontSize: 18,
              lineHeight: 1.4,
              color: 'var(--ink)',
              background: 'transparent',
              border: '1.5px solid var(--ink-soft)',
              borderRadius: 6,
              padding: '10px 12px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <span className="tiny" style={{ color: 'var(--ink-faint)' }}>
            ⌘+Enter to save · Esc to cancel · skip = mark done without a note
          </span>
        </div>

        <div className="row items-center justify-between" style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={() => clearCompletion()}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              padding: '8px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            cancel
          </button>
          <div className="row" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => void finish(false)}
              className="ui wobble hover:bg-paper-warm transition-colors"
              style={{
                border: '1.5px solid var(--ink-soft)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                padding: '8px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              skip note
            </button>
            <button
              type="submit"
              className="ui-b wobble hover:opacity-90 transition-opacity"
              style={{
                border: '1.5px solid var(--sage-deep)',
                background: 'var(--sage-deep)',
                color: 'var(--paper)',
                padding: '8px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              save & done
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
