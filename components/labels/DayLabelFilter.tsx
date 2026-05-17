'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

/** Row of color-chip filters above the Tasks list. Clicking a chip narrows
 *  the day's task view to that label; clicking again clears the filter. */
export function DayLabelFilter({ userId }: Props) {
  const labels = useLiveQuery(
    () => getDb().labels.where('user_id').equals(userId).sortBy('name'),
    [userId],
    [],
  );
  const dayLabelFilter = useUiStore((s) => s.dayLabelFilter);
  const setDayLabelFilter = useUiStore((s) => s.setDayLabelFilter);
  const setLabelsManagerOpen = useUiStore((s) => s.setLabelsManagerOpen);

  if (!labels || labels.length === 0) {
    // The "+ add labels" entry point lives in the footer; render nothing here
    // until the user has at least one label to filter by.
    return null;
  }

  return (
    <div className="row items-center" style={{ gap: 6, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => setDayLabelFilter(null)}
        className={cn('ui transition-colors hover:bg-paper-warm')}
        style={{
          padding: '2px 8px',
          borderRadius: 999,
          border: '1.5px solid',
          borderColor: dayLabelFilter === null ? 'var(--ink)' : 'var(--ink-faint)',
          background: dayLabelFilter === null ? 'var(--ink)' : 'transparent',
          color: dayLabelFilter === null ? 'var(--paper)' : 'var(--ink-faint)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        all
      </button>
      {labels.map((l) => {
        const isActive = dayLabelFilter === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => setDayLabelFilter(isActive ? null : l.id)}
            className="ui transition-opacity hover:opacity-100"
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              border: '1.5px solid',
              borderColor: l.color,
              background: isActive ? l.color : 'transparent',
              color: isActive ? '#FFFFFF' : l.color,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              opacity: dayLabelFilter && !isActive ? 0.5 : 1,
            }}
          >
            {l.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setLabelsManagerOpen(true)}
        aria-label="Manage labels"
        title="Manage labels"
        className="hover:bg-paper-warm transition-colors"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-faint)',
          padding: '2px 6px',
          fontSize: 12,
          cursor: 'pointer',
          borderRadius: 3,
        }}
      >
        ⚙
      </button>
    </div>
  );
}
