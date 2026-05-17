'use client';

import { useEffect, useRef } from 'react';
import { useConfirmStore } from '@/lib/store/useConfirmStore';

/** Themed replacement for window.confirm(). Mounted once at the root. */
export function ConfirmDialog() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const resolveAndClose = useConfirmStore((s) => s.resolveAndClose);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); resolveAndClose(false); }
      if (e.key === 'Enter')  { e.preventDefault(); resolveAndClose(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, resolveAndClose]);

  if (!open || !options) return null;

  const dangerColor = 'var(--terra-deep)';
  const confirmBg = options.danger ? dangerColor : 'var(--sage-deep)';
  const confirmBorder = options.danger ? dangerColor : 'var(--sage-deep)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) resolveAndClose(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          gap: 12,
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <span
            className="tiny"
            style={{ color: options.danger ? dangerColor : 'var(--ink-faint)' }}
          >
            {options.danger ? 'confirm delete' : 'confirm'}
          </span>
          <h2
            id="confirm-title"
            className="hand"
            style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 700, margin: 0 }}
          >
            {options.title}
          </h2>
        </div>

        {options.body && (
          <p
            className="hand"
            style={{
              fontSize: 17,
              lineHeight: 1.4,
              color: 'var(--ink-soft)',
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {options.body}
          </p>
        )}

        <div className="row items-center justify-end" style={{ gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => resolveAndClose(false)}
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
            {options.cancelLabel ?? 'cancel'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => resolveAndClose(true)}
            className="ui-b wobble hover:opacity-90 transition-opacity"
            style={{
              border: `1.5px solid ${confirmBorder}`,
              background: confirmBg,
              color: 'var(--paper)',
              padding: '8px 14px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {options.confirmLabel ?? (options.danger ? 'delete' : 'confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
