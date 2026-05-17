import { create } from 'zustand';
import { todayKey } from '@/lib/time/dayKey';

export type View = 'today' | 'range' | 'archive';

interface UiState {
  currentDayKey: string;
  setCurrentDayKey: (key: string) => void;

  view: View;
  setView: (v: View) => void;

  rangeWindow: number; // 1–5
  setRangeWindow: (n: number) => void;

  editingTaskId: string | null;
  isEditorOpen: boolean;
  openEditor: (taskId?: string) => void;
  closeEditor: () => void;

  /** Pending completion: when set, CompletionPrompt opens for this task. */
  completingTaskId: string | null;
  requestCompletion: (taskId: string) => void;
  clearCompletion: () => void;

  habitsEditorOpen: boolean;
  setHabitsEditorOpen: (open: boolean) => void;

  labelsManagerOpen: boolean;
  setLabelsManagerOpen: (open: boolean) => void;

  /** Day-view filter: when set, only tasks with this label show in TaskList. */
  dayLabelFilter: string | null;
  setDayLabelFilter: (id: string | null) => void;

  notepadArchiveOpen: boolean;
  setNotepadArchiveOpen: (open: boolean) => void;

  scratchOpen: boolean;
  setScratchOpen: (open: boolean) => void;

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

  view: 'today',
  setView: (v) => set({ view: v }),

  rangeWindow: 5,
  setRangeWindow: (n) => set({ rangeWindow: n }),

  editingTaskId: null,
  isEditorOpen: false,
  openEditor: (taskId) => set({ isEditorOpen: true, editingTaskId: taskId ?? null }),
  closeEditor: () => set({ isEditorOpen: false, editingTaskId: null }),

  completingTaskId: null,
  requestCompletion: (taskId) => set({ completingTaskId: taskId }),
  clearCompletion: () => set({ completingTaskId: null }),

  habitsEditorOpen: false,
  setHabitsEditorOpen: (open) => set({ habitsEditorOpen: open }),

  labelsManagerOpen: false,
  setLabelsManagerOpen: (open) => set({ labelsManagerOpen: open }),

  dayLabelFilter: null,
  setDayLabelFilter: (id) => set({ dayLabelFilter: id }),

  notepadArchiveOpen: false,
  setNotepadArchiveOpen: (open) => set({ notepadArchiveOpen: open }),

  scratchOpen: false,
  setScratchOpen: (open) => set({ scratchOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  syncStatus: 'idle',
  setSyncStatus: (s) => set({ syncStatus: s }),

  lastSyncedAt: null,
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
}));
