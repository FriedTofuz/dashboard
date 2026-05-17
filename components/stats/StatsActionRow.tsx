'use client';

import { useUiStore } from '@/lib/store/useUiStore';

interface StatsActionRowProps {
  /** Penzu URL (overridable for testing). */
  journalUrl?: string;
}

/** Four equal-width buttons that sit above the StatsCard.
 *  Slots: Journal · Scratch · (reserved) · (reserved) */
export function StatsActionRow({
  journalUrl = 'https://penzu.com',
}: StatsActionRowProps) {
  const setScratchOpen = useUiStore((s) => s.setScratchOpen);

  return (
    <div
      className="no-print"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
      }}
    >
      <ActionButton
        label="Journal"
        onClick={() => window.open(journalUrl, '_blank', 'noopener,noreferrer')}
        aria-label="Open daily journal"
      />
      <ActionButton
        label="Scratch"
        onClick={() => setScratchOpen(true)}
        aria-label="Open scratch notes"
      />
      <ActionButton placeholder />
      <ActionButton placeholder />
    </div>
  );
}

interface ActionButtonProps {
  label?: string;
  onClick?: () => void;
  placeholder?: boolean;
  'aria-label'?: string;
}

function ActionButton({
  label,
  onClick,
  placeholder = false,
  'aria-label': ariaLabel,
}: ActionButtonProps) {
  if (placeholder) {
    return (
      <div
        aria-hidden
        className="wobble"
        style={{
          border: '1.5px dashed var(--ink-faint)',
          borderRadius: 6,
          background: 'transparent',
          padding: '12px 14px',
          minHeight: 48,
          opacity: 0.35,
        }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="ui-b wobble hover:wash-sage transition-colors"
      style={{
        border: '1.5px solid var(--ink-soft)',
        borderRadius: 6,
        background: 'var(--paper)',
        color: 'var(--ink)',
        padding: '12px 14px',
        minHeight: 48,
        fontSize: 14,
        letterSpacing: '0.08em',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
