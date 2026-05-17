'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Sunflower } from './Sunflower';
import { getDb } from '@/lib/idb/db';
import type { FlowerState } from '@/lib/compute/flowerState';

interface FlowerCardProps {
  state: FlowerState;
  dayKey?: string;
  userId?: string;
  /** Override the auto-computed day number (otherwise: distinct logged days). */
  dayNumber?: number;
}

const captions: Record<FlowerState, { state: string; rest: string }> = {
  thriving: { state: 'Thriving',  rest: ' — radiant today' },
  healthy:  { state: 'Healthy',   rest: ' — on pace, keep it up' },
  drooping: { state: 'Drooping',  rest: ' — finish 1 more priority and it perks back up' },
  wilting:  { state: 'Wilting',   rest: ' — one tiny task brings it back' },
};

export function FlowerCard({ state, userId, dayNumber }: FlowerCardProps) {
  // Compute "day N" as the count of distinct day records for this user.
  const dayRows = useLiveQuery(
    () =>
      userId
        ? getDb().days.where('user_id').equals(userId).count()
        : Promise.resolve(0),
    [userId],
    0,
  );

  const computedDay = Math.max(dayNumber ?? dayRows, 1);
  const isFirstDay = computedDay <= 1;
  const cap = captions[state];

  return (
    <div
      className="paper dotgrid wobble col"
      style={{
        border: '1.5px solid var(--ink-soft)',
        borderRadius: 6,
        padding: '18px 20px',
        height: 420,
        boxSizing: 'border-box',
      }}
    >
      <div className="row items-baseline justify-between">
        <span
          className="ui-b"
          style={{
            fontSize: 14,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          Your sunflower
        </span>
        <span
          className="ui num"
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
          }}
        >
          Day {computedDay}
        </span>
      </div>

      <div
        className="flex-1 flex items-end justify-center"
        style={{ overflow: 'hidden', padding: '4px 0', minHeight: 0 }}
      >
        <Sunflower state={state} size={isFirstDay ? 200 : 240} />
      </div>

      {/* §8 first-run uses "fresh start" caption inside the card */}
      <p
        className="hand"
        style={{
          fontSize: 17,
          color: 'var(--ink-soft)',
          textAlign: 'center',
          paddingTop: 4,
          margin: 0,
        }}
      >
        {isFirstDay ? (
          <>fresh start <span style={{ color: 'var(--ochre-deep)' }}>✦ day 1</span></>
        ) : (
          <>
            <span style={{ color: 'var(--terra-deep)', fontWeight: 600 }}>{cap.state}</span>
            {cap.rest}
          </>
        )}
      </p>
    </div>
  );
}
