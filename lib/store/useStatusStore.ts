'use client';

import { create } from 'zustand';

export type CurrentStatus = 'working' | 'breaking' | 'resting' | 'away';

interface StatusState {
  status: CurrentStatus;
  /** True once the user has chosen a status manually this session. Auto
   *  triggers (start-timer → working, pause → breaking) are suppressed while
   *  this is true so we don't yank the status out from under the user's
   *  explicit choice. Resets on page reload. */
  manuallySet: boolean;

  /** Set the status from a user action (menu pick). Marks manuallySet=true. */
  setManual: (status: CurrentStatus) => void;
  /** Set the status from an auto trigger. No-op when manuallySet=true. */
  setAuto: (status: CurrentStatus) => void;
  /** Clear the manual flag so auto behavior resumes. */
  clearManual: () => void;
}

const STORAGE_KEY = 'sunflower:status';

function readInitial(): CurrentStatus {
  if (typeof window === 'undefined') return 'working';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'working' || raw === 'breaking' || raw === 'resting' || raw === 'away') {
    return raw;
  }
  return 'working';
}

function persist(status: CurrentStatus) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, status);
  } catch {
    /* ignore */
  }
}

export const useStatusStore = create<StatusState>()((set, get) => ({
  status: readInitial(),
  manuallySet: false,

  setManual: (status) => {
    persist(status);
    set({ status, manuallySet: true });
  },
  setAuto: (status) => {
    if (get().manuallySet) return;
    persist(status);
    set({ status });
  },
  clearManual: () => set({ manuallySet: false }),
}));
