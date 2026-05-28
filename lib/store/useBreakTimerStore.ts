'use client';

import { create } from 'zustand';

interface BreakTimerState {
  /** Prompt dialog is open (user about to pick a duration). */
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;

  /** Active countdown — epoch ms when the break is scheduled to end. null
   *  when no countdown is running. */
  endsAt: number | null;
  /** Total break duration in ms (used to render progress + the chip label). */
  durationMs: number | null;

  start: (minutes: number) => void;
  cancel: () => void;
}

export const useBreakTimerStore = create<BreakTimerState>()((set) => ({
  promptOpen: false,
  openPrompt: () => set({ promptOpen: true }),
  closePrompt: () => set({ promptOpen: false }),

  endsAt: null,
  durationMs: null,
  start: (minutes) => {
    const ms = Math.max(1, Math.round(minutes * 60_000));
    // v2.4.1: keep promptOpen=true so the dialog stays on screen, showing
    // the live countdown rather than disappearing once a duration is picked.
    set({
      endsAt: Date.now() + ms,
      durationMs: ms,
    });
  },
  cancel: () => set({ endsAt: null, durationMs: null, promptOpen: false }),
}));
