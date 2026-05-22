'use client';

import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '@/lib/store/useUiStore';
import { getDb } from '@/lib/idb/db';
import { toggleDayLogged } from '@/lib/idb/days';
import { toast } from '@/lib/store/useToastStore';
import { formatDayLabel } from '@/lib/time/dayKey';

interface StatsActionRowProps {
  userId: string;
  /** Penzu URL (overridable for testing). */
  journalUrl?: string;
  /** Whether to show the Calendar button. Hidden on mobile per spec. */
  showCalendar?: boolean;
}

/** Two rows of four equal-width buttons that sit above the StatsCard.
 *
 *  Row 1: Calendar · Scratch · Journal · Search
 *  Row 2: Log Day · (reserved) · (reserved) · (reserved) */
export function StatsActionRow({
  userId,
  journalUrl = 'https://penzu.com',
  showCalendar = true,
}: StatsActionRowProps) {
  const router = useRouter();
  const setScratchOpen = useUiStore((s) => s.setScratchOpen);
  const setTaskSearchOpen = useUiStore((s) => s.setTaskSearchOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const currentDayKey = useUiStore((s) => s.currentDayKey);

  const day = useLiveQuery(
    () => getDb().days.get([userId, currentDayKey]),
    [userId, currentDayKey],
  );
  const isLogged = day?.logged_at != null;

  async function onLogDay() {
    const nowLogged = await toggleDayLogged(userId, currentDayKey);
    const { monthDay } = formatDayLabel(currentDayKey);
    toast(nowLogged ? `logged ${monthDay}` : `unlogged ${monthDay}`);
  }

  return (
    <div className="col no-print" style={{ gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {showCalendar ? (
          <ActionButton
            label="Calendar"
            onClick={() => router.push('/calendar')}
            aria-label="Open calendar"
          />
        ) : (
          <ActionButton placeholder />
        )}
        <ActionButton
          label="Scratch"
          onClick={() => setScratchOpen(true)}
          aria-label="Open scratch notes"
        />
        <ActionButton
          label="Journal"
          onClick={() => window.open(journalUrl, '_blank', 'noopener,noreferrer')}
          aria-label="Open daily journal"
        />
        <ActionButton
          label="Search"
          onClick={() => setTaskSearchOpen(true)}
          aria-label="Search all tasks"
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <ActionButton
          label={isLogged ? 'Logged ✓' : 'Log Day'}
          onClick={() => void onLogDay()}
          aria-label={isLogged ? 'Unlog this day' : 'Log this day for stats'}
          accent={isLogged ? 'sage' : undefined}
        />
        <ActionButton placeholder />
        <ActionButton placeholder />
        <ActionButton
          label="Settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label?: string;
  onClick?: () => void;
  placeholder?: boolean;
  'aria-label'?: string;
  accent?: 'sage' | 'terra';
}

function ActionButton({
  label,
  onClick,
  placeholder = false,
  'aria-label': ariaLabel,
  accent,
}: ActionButtonProps) {
  if (placeholder) {
    return (
      <div
        aria-hidden
        className="wobble"
        style={{
          border: '1.5px dashed var(--ink-faint)',
          borderRadius: 6,
          background: 'transparent',
          padding: '12px 14px',
          minHeight: 48,
          opacity: 0.35,
        }}
      />
    );
  }
  const borderColor =
    accent === 'sage' ? 'var(--sage-deep)'
    : accent === 'terra' ? 'var(--terra-deep)'
    : 'var(--ink-soft)';
  const background =
    accent === 'sage' ? 'var(--sage-wash, rgba(107, 138, 92, 0.10))'
    : 'var(--paper)';
  const color =
    accent === 'sage' ? 'var(--sage-deep)'
    : accent === 'terra' ? 'var(--terra-deep)'
    : 'var(--ink)';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="ui-b wobble hover:wash-sage transition-colors"
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: 6,
        background,
        color,
        padding: '12px 14px',
        minHeight: 48,
        fontSize: 14,
        letterSpacing: '0.08em',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
