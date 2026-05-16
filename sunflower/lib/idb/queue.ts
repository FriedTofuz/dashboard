import { getDb } from './db';

/** Fire-and-forget: append a write to the sync queue. */
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
}
