'use client';

import { useUiStore } from '@/lib/store/useUiStore';

/** A dimmed, task-shaped row that opens the editor when clicked. */
export function AddTaskGhostRow() {
  const openEditor = useUiStore((s) => s.openEditor);

  return (
    <button
      type="button"
      onClick={() => openEditor()}
      className="flex items-center gap-3 hover:opacity-100 transition-opacity"
      style={{
        opacity: 0.7,
        minHeight: 36,
        background: 'var(--paper-warm)',
        border: '1px dashed var(--ink-faint)',
        borderRadius: 6,
        padding: '6px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
      aria-label="Add a task"
    >
      <span className="num-prefix" aria-hidden>＋</span>
      <span
        aria-hidden
        className="wobble"
        style={{
          display: 'inline-block',
          width: 18,
          height: 18,
          border: '1.6px dashed var(--ink-faint)',
          borderRadius: 3,
          flexShrink: 0,
        }}
      />
      <span
        className="task-label"
        style={{ color: 'var(--ink-faint)', fontStyle: 'italic', flex: 1 }}
      >
        add a task…
      </span>
      <span
        className="hand"
        style={{
          color: 'var(--ink-faint)',
          fontSize: 17,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontStyle: 'italic',
        }}
      >
        — est. min
      </span>
    </button>
  );
}
