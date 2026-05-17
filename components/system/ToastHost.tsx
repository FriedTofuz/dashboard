'use client';

import { useToastStore, type Toast } from '@/lib/store/useToastStore';

/** Mounted once in the root layout. Renders queued toasts in the bottom-right. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed no-print"
      style={{
        right: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        zIndex: 60,
        pointerEvents: 'none',
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const accent =
    toast.kind === 'success'
      ? { border: 'var(--sage-deep)', glyph: '✿', glyphColor: 'var(--sage-deep)' }
      : toast.kind === 'warn'
        ? { border: 'var(--terra-deep)', glyph: '⚠', glyphColor: 'var(--terra-deep)' }
        : { border: 'var(--ink-soft)', glyph: '·',  glyphColor: 'var(--ink-faint)' };

  return (
    <div
      className="paper wobble"
      style={{
        pointerEvents: 'auto',
        border: `1.5px solid ${accent.border}`,
        borderRadius: 6,
        padding: '12px 14px',
        background: 'var(--paper)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'toast-in 200ms ease-out',
      }}
    >
      <span
        aria-hidden
        className="hand"
        style={{ fontSize: 20, color: accent.glyphColor, lineHeight: 1, flexShrink: 0 }}
      >
        {accent.glyph}
      </span>
      <span
        className="hand"
        style={{ fontSize: 17, color: 'var(--ink)', flex: 1, lineHeight: 1.3 }}
      >
        {toast.message}
      </span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onAction(); onDismiss(); }}
          className="ui-b hover:bg-paper-warm transition-colors"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--terra-deep)',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="hover:bg-paper-warm transition-colors"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-faint)',
          fontSize: 14,
          padding: 4,
          borderRadius: 4,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
