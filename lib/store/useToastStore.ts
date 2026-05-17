import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warn';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** Optional action button (e.g. "undo"). */
  action?: { label: string; onAction: () => void };
  ttlMs: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'ttlMs'> & { ttlMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const toast: Toast = { ...t, id, ttlMs: t.ttlMs ?? 4000 };
    set({ toasts: [...get().toasts, toast] });
    if (toast.ttlMs > 0) {
      setTimeout(() => get().dismiss(id), toast.ttlMs);
    }
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clear: () => set({ toasts: [] }),
}));

// ── Convenience top-level helpers ────────────────────────────────────────
export function toast(message: string, opts?: Omit<Toast, 'id' | 'ttlMs' | 'message' | 'kind'> & { kind?: ToastKind; ttlMs?: number }) {
  return useToastStore.getState().push({
    message,
    kind: opts?.kind ?? 'info',
    action: opts?.action,
    ttlMs: opts?.ttlMs,
  });
}

export const toastSuccess = (msg: string, opts?: Omit<Toast, 'id' | 'ttlMs' | 'message' | 'kind'>) =>
  toast(msg, { ...opts, kind: 'success' });

export const toastWarn = (msg: string, opts?: Omit<Toast, 'id' | 'ttlMs' | 'message' | 'kind'>) =>
  toast(msg, { ...opts, kind: 'warn' });
