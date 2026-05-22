import { create } from 'zustand';

/** Accent palette — controls the two primary accents (R3 + tasks).
 *  Orthogonal to light/dark mode in `useThemeStore`. */
export type AccentPalette = 'default' | 'berkeley';

export interface AccentDefinition {
  id: AccentPalette;
  label: string;
  /** Marketing blurb shown in the settings preview. */
  description: string;
  /** Color preview swatches: [r3-accent, tasks-accent]. */
  swatches: [string, string];
}

export const ACCENT_PALETTES: Record<AccentPalette, AccentDefinition> = {
  default: {
    id: 'default',
    label: 'Sage & Terracotta',
    description: 'The original palette — sage green for the Rule of 3, terracotta for tasks.',
    swatches: ['#6B8A5C', '#B85C3E'],
  },
  berkeley: {
    id: 'berkeley',
    label: 'Berkeley Blue & Gold',
    description: 'California gold for the Rule of 3, Berkeley blue for tasks.',
    swatches: ['#FDB515', '#002676'],
  },
};

interface AccentState {
  accent: AccentPalette;
  setAccent: (a: AccentPalette) => void;
}

const STORAGE_KEY = 'sunflower:accent';

function applyAccent(accent: AccentPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (accent === 'default') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
}

function readInitial(): AccentPalette {
  if (typeof window === 'undefined') return 'default';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'berkeley' || raw === 'default') return raw;
  return 'default';
}

export const useAccentStore = create<AccentState>()((set) => ({
  accent: 'default',
  setAccent: (a) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, a);
    }
    applyAccent(a);
    set({ accent: a });
  },
}));

export function bootstrapAccent() {
  if (typeof window === 'undefined') return;
  const accent = readInitial();
  applyAccent(accent);
  useAccentStore.setState({ accent });
}
