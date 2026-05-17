import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'sunflower:theme';

function applyMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

function readInitial(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  mode: 'system',
  setMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    applyMode(mode);
    set({ mode });
  },
  toggle: () => {
    const current = get().mode;
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },
}));

export function bootstrapTheme() {
  if (typeof window === 'undefined') return;
  const mode = readInitial();
  applyMode(mode);
  useThemeStore.setState({ mode });

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().mode === 'system') applyMode('system');
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
}
