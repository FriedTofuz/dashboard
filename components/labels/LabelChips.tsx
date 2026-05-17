'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Label } from '@/lib/idb/db';

interface Props {
  taskId: string;
  size?: 'sm' | 'md';
  /** Cap the number of chips rendered. Overflow shows as "+N". */
  max?: number;
}

/** Inline chips for a task's labels. Reads task_labels live; rendering is
 *  side-effect free so it's safe to drop into TaskRow / ArchiveTaskRow. */
export function LabelChips({ taskId, size = 'sm', max = 4 }: Props) {
  const links = useLiveQuery(
    () => getDb().task_labels.where('task_id').equals(taskId).toArray(),
    [taskId],
    [],
  );
  const labels = useLiveQuery(
    () => getDb().labels.toArray(),
    [],
    [],
  );

  if (!links || links.length === 0) return null;
  const byId = new Map((labels ?? []).map((l) => [l.id, l]));
  const assigned: Label[] = links
    .map((link) => byId.get(link.label_id))
    .filter((l): l is Label => Boolean(l));
  if (assigned.length === 0) return null;

  const shown = assigned.slice(0, max);
  const overflow = assigned.length - shown.length;

  const isSmall = size === 'sm';

  return (
    <span
      className="row items-center"
      style={{ gap: 4, flexWrap: 'wrap', flexShrink: 0 }}
    >
      {shown.map((l) => (
        <span
          key={l.id}
          title={l.name}
          className="ui"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isSmall ? '1px 6px' : '2px 8px',
            borderRadius: 999,
            background: l.color,
            color: '#FFFFFF',
            fontSize: isSmall ? 10 : 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {l.name}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="ui muted"
          style={{ fontSize: isSmall ? 10 : 12, fontWeight: 500 }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
