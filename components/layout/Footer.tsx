'use client';

import { useUiStore } from '@/lib/store/useUiStore';
import { ThemeToggle } from '@/components/system/ThemeToggle';

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 5_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 1) return `${Math.floor(diff / 1000)}s ago`;
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const btnStyle: React.CSSProperties = {
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
};

const kbdStyle: React.CSSProperties = {
  ...btnStyle,
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  padding: '8px 10px',
};

export function Footer() {
  const setHabitsEditorOpen = useUiStore((s) => s.setHabitsEditorOpen);
  const setLabelsManagerOpen = useUiStore((s) => s.setLabelsManagerOpen);
  const setQuotesManagerOpen = useUiStore((s) => s.setQuotesManagerOpen);
  const setView = useUiStore((s) => s.setView);
  const view = useUiStore((s) => s.view);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const syncStatus = useUiStore((s) => s.syncStatus);
  const lastSyncedAt = useUiStore((s) => s.lastSyncedAt);

  const syncLabel =
    syncStatus === 'syncing'
      ? 'syncing…'
      : syncStatus === 'error'
        ? 'offline'
        : `last synced · ${timeAgo(lastSyncedAt)}`;

  return (
    <div
      className="row items-center justify-between no-print"
      style={{ marginTop: 'auto', paddingTop: 12, gap: 12, flexWrap: 'wrap' }}
    >
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setHabitsEditorOpen(true)}
          className="wobble hover:bg-paper-warm transition-colors"
          style={btnStyle}
        >
          habits
        </button>
        <button
          type="button"
          onClick={() => setLabelsManagerOpen(true)}
          className="wobble hover:bg-paper-warm transition-colors"
          style={btnStyle}
        >
          labels
        </button>
        <button
          type="button"
          onClick={() => setQuotesManagerOpen(true)}
          className="wobble hover:bg-paper-warm transition-colors"
          style={btnStyle}
        >
          quotes
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'range' ? 'today' : 'range')}
          className="wobble hover:bg-paper-warm transition-colors"
          style={btnStyle}
        >
          {view === 'range' ? 'today' : 'range view'}
        </button>
        <button
          type="button"
          onClick={() => setView('archive')}
          className="wobble hover:bg-paper-warm transition-colors"
          style={{ ...btnStyle, color: 'var(--ink-faint)' }}
        >
          archive
        </button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="wobble hover:bg-paper-warm transition-colors"
          style={{ ...kbdStyle, color: 'var(--ink-faint)' }}
          aria-label="Open command palette"
        >
          ⌘K
        </button>
        <ThemeToggle />
      </div>
      <span
        className="ui"
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}
      >
        {syncLabel}
      </span>
    </div>
  );
}
