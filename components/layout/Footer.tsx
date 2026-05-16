'use client';

import { useUiStore } from '@/lib/store/useUiStore';

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

export function Footer() {
  const openEditor = useUiStore((s) => s.openEditor);
  const setHabitsEditorOpen = useUiStore((s) => s.setHabitsEditorOpen);
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
    <div className="row items-center justify-between mt-2 flex-wrap gap-2">
      <div className="row gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => openEditor()}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
        >
          + add task
        </button>
        <button
          type="button"
          onClick={() => setHabitsEditorOpen(true)}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
        >
          habits
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'range' ? 'today' : 'range')}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
        >
          {view === 'range' ? 'today' : 'range view'}
        </button>
        <button
          type="button"
          onClick={() => setView('archive')}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors muted"
        >
          archive
        </button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors muted"
        >
          ⌘K
        </button>
      </div>
      <span className="tiny muted">{syncLabel}</span>
    </div>
  );
}
