import { create } from 'zustand';
import { todayKey } from '@/lib/time/dayKey';

export type View = 'today' | 'range' | 'archive';

const DAY_KEY_STORAGE = 'sunflower:lastDayKey';

/** Read the persisted day key from sessionStorage (refresh-survival),
 *  validating it looks like YYYY-MM-DD. Returns today if absent / malformed. */
function loadInitialDayKey(): string {
  if (typeof window === 'undefined') return todayKey();
  try {
    const raw = window.sessionStorage.getItem(DAY_KEY_STORAGE);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  } catch {
    // sessionStorage can throw in private-mode iframes; fall back to today.
  }
  return todayKey();
}

function persistDayKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DAY_KEY_STORAGE, key);
  } catch {
    /* ignore */
  }
}

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

  quotesManagerOpen: boolean;
  setQuotesManagerOpen: (open: boolean) => void;

  /** Day-view filter: when set, only tasks with this label show in TaskList. */
  dayLabelFilter: string | null;
  setDayLabelFilter: (id: string | null) => void;

  notepadArchiveOpen: boolean;
  setNotepadArchiveOpen: (open: boolean) => void;

  scratchOpen: boolean;
  setScratchOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  /** Global task search modal — open from the Search button. */
  taskSearchOpen: boolean;
  setTaskSearchOpen: (open: boolean) => void;

  /** Settings modal — opened from the bottom-right action row button. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  /** Passwords manager modal — PIN-gated. */
  passwordsOpen: boolean;
  setPasswordsOpen: (open: boolean) => void;

  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus: (s: 'idle' | 'syncing' | 'error') => void;

  lastSyncedAt: number | null;
  setLastSyncedAt: (ts: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  currentDayKey: loadInitialDayKey(),
  setCurrentDayKey: (key) => {
    persistDayKey(key);
    set({ currentDayKey: key });
  },

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

  quotesManagerOpen: false,
  setQuotesManagerOpen: (open) => set({ quotesManagerOpen: open }),

  dayLabelFilter: null,
  setDayLabelFilter: (id) => set({ dayLabelFilter: id }),

  notepadArchiveOpen: false,
  setNotepadArchiveOpen: (open) => set({ notepadArchiveOpen: open }),

  scratchOpen: false,
  setScratchOpen: (open) => set({ scratchOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  taskSearchOpen: false,
  setTaskSearchOpen: (open) => set({ taskSearchOpen: open }),

  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  passwordsOpen: false,
  setPasswordsOpen: (open) => set({ passwordsOpen: open }),

  syncStatus: 'idle',
  setSyncStatus: (s) => set({ syncStatus: s }),

  lastSyncedAt: null,
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
}));
