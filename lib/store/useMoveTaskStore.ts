import { create } from 'zustand';

export interface MoveTaskPromptOptions {
  taskId: string;
  taskTitle: string;
  /** Original day_key — shown so user can see where the task came from. */
  fromDayKey: string;
}

interface MoveTaskState {
  open: boolean;
  options: MoveTaskPromptOptions | null;
  show: (options: MoveTaskPromptOptions) => void;
  close: () => void;
}

export const useMoveTaskStore = create<MoveTaskState>()((set) => ({
  open: false,
  options: null,
  show: (options) => set({ open: true, options }),
  close: () => set({ open: false, options: null }),
}));

export function promptMoveTask(options: MoveTaskPromptOptions): void {
  useMoveTaskStore.getState().show(options);
}
