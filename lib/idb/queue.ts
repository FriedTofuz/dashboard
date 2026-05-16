import { getDb } from './db';

let _flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Fire-and-forget: append a write to the sync queue, then debounce-flush. */
export function enqueue(
  op: 'upsert' | 'delete',
  table: string,
  rowId: string,
  payload: unknown,
): void {
  getDb()
    .write_queue.add({
      op,
      table,
      row_id: rowId,
      payload,
      attempted_at: Date.now(),
      attempts: 0,
    })
    .catch((err) => console.error('[queue] enqueue failed', err));

  // Debounce: flush 250 ms after the last enqueue. Lazy import to avoid SSR bundling.
  if (typeof window === 'undefined') return;
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    import('./sync')
      .then(({ flushQueue }) => flushQueue())
      .catch(() => {});
  }, 250);
}
