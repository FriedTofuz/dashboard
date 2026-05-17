import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button uses terracotta to signal a destructive action. */
  danger?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  show: (options: ConfirmOptions) => Promise<boolean>;
  resolveAndClose: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  show: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    });
  },
  resolveAndClose: (value) => {
    const r = get().resolve;
    set({ open: false, options: null, resolve: null });
    r?.(value);
  },
}));

/** Convenience helper: const ok = await confirm({ title: 'Delete?', danger: true }) */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().show(options);
}
