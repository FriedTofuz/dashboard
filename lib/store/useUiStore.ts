import { create } from 'zustand';
import { todayKey } from '@/lib/time/dayKey';

interface UiState {
  currentDayKey: string;
  setCurrentDayKey: (key: string) => void;

  rangeWindow: number; // 1–5
  setRangeWindow: (n: number) => void;

  editingTaskId: string | null;  // null = new task
  isEditorOpen: boolean;
  openEditor: (taskId?: string) => void;
  closeEditor: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus: (s: 'idle' | 'syncing' | 'error') => void;

  lastSyncedAt: number | null;
  setLastSyncedAt: (ts: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  currentDayKey: todayKey(),
  setCurrentDayKey: (key) => set({ currentDayKey: key }),

  rangeWindow: 5,
  setRangeWindow: (n) => set({ rangeWindow: n }),

  editingTaskId: null,
  isEditorOpen: false,
  openEditor: (taskId) => set({ isEditorOpen: true, editingTaskId: taskId ?? null }),
  closeEditor: () => set({ isEditorOpen: false, editingTaskId: null }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  syncStatus: 'idle',
  setSyncStatus: (s) => set({ syncStatus: s }),

  lastSyncedAt: null,
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
}));
