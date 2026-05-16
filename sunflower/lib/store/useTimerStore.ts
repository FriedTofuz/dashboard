import { create } from 'zustand';

interface TimerState {
  activeTaskId: string | null;
  tickMs: number;  // total elapsed ms for the active task (live-updating)
  setTick: (taskId: string, ms: number) => void;
  clearTick: () => void;
}

export const useTimerStore = create<TimerState>()((set) => ({
  activeTaskId: null,
  tickMs: 0,
  setTick: (taskId, ms) => set({ activeTaskId: taskId, tickMs: ms }),
  clearTick: () => set({ activeTaskId: null, tickMs: 0 }),
}));
