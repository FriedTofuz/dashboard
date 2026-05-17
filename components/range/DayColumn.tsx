'use client';

import { useDroppable } from '@dnd-kit/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Task } from '@/lib/idb/db';
import { Sunflower } from '@/components/sunflower/Sunflower';
import { formatDayLabel, todayKey } from '@/lib/time/dayKey';
import { progressForDay } from '@/lib/compute/progress';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';
import type { FlowerState } from '@/lib/compute/flowerState';

interface DayColumnProps {
  dayKey: string;
}

export function DayColumn({ dayKey }: DayColumnProps) {
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);
  const setView = useUiStore((s) => s.setView);
  const isToday = dayKey === todayKey();
  const { weekday, monthDay } = formatDayLabel(dayKey);

  const droppable = useDroppable({ id: `day-${dayKey}` });

  const tasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(dayKey)
        .filter((t) => !t.archived)
        .toArray(),
    [dayKey],
    [],
  );

  const list = tasks ?? [];
  const progress = progressForDay(list);
  const r3Done = list.filter((t) => t.r3_slot != null && t.state === 'done').length;
  const flowerState: FlowerState =
    progress.value >= 75 ? 'thriving'
      : progress.value >= 50 ? 'healthy'
      : progress.value >= 25 ? 'drooping'
      : 'wilting';

  const r3BySlot = (slot: 1 | 2 | 3) =>
    list.find((t) => t.r3_slot === slot && !t.archived);

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        'paper rounded-card col wobble transition-colors',
        droppable.isOver && 'wash-sage',
      )}
      style={{
        border: isToday
          ? '1.6px solid var(--terra-deep)'
          : '1.5px solid var(--ink-soft)',
        background: isToday ? 'var(--terra-tint)' : undefined,
        padding: 14,
        gap: 12,
        minHeight: 320,
      }}
    >
      <button
        type="button"
        onClick={() => {
          setCurrentDayKey(dayKey);
          setView('today');
        }}
        className="row items-center justify-between hover:opacity-80 transition-opacity"
        style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <div className="col" style={{ gap: 2 }}>
          <span className="tiny">{weekday}</span>
          <span
            className="hand"
            style={{ fontSize: 23, lineHeight: 1, fontWeight: 600 }}
          >
            {isToday ? <span className="underline-hand">{monthDay}</span> : monthDay}
          </span>
        </div>
        <div style={{ width: 48, height: 72, marginRight: -8 }}>
          <Sunflower state={flowerState} size={48} />
        </div>
      </button>

      <div className="col" style={{ gap: 4 }}>
        <div className="bar" style={{ height: 6 }}>
          <div className="bar-fill" style={{ width: `${progress.value}%` }} />
        </div>
        <div className="row items-center justify-between">
          <span className="tiny num">{progress.value}%</span>
          <span className="tiny num">r3 {r3Done}/3</span>
        </div>
      </div>

      {/* Three stacked R3 boxes — fixed slots, no other tasks shown here. */}
      <div className="col" style={{ gap: 8 }}>
        {[1, 2, 3].map((slot) => (
          <R3MiniBox key={slot} slot={slot as 1 | 2 | 3} task={r3BySlot(slot as 1 | 2 | 3)} />
        ))}
      </div>
    </div>
  );
}

// ── Single R3 slot box in the range view ─────────────────────────────────

interface R3MiniBoxProps {
  slot: 1 | 2 | 3;
  task: Task | undefined;
}

function R3MiniBox({ slot, task }: R3MiniBoxProps) {
  if (!task) {
    return (
      <div
        style={{
          border: '1.5px dashed var(--ink-faint)',
          borderRadius: 5,
          padding: '10px 12px',
          minHeight: 56,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span className="tiny" style={{ opacity: 0.6 }}>
          priority {slot}
        </span>
        <span
          className="hand muted italic"
          style={{ fontSize: 14, color: 'var(--ink-faint)' }}
        >
          —
        </span>
      </div>
    );
  }

  const isDone = task.state === 'done';
  const isRunning = task.state === 'running';
  const bg = isDone
    ? 'var(--sage-wash)'
    : isRunning
      ? 'var(--terra-wash)'
      : 'var(--paper)';
  const border = isDone
    ? '1.6px solid var(--sage-deep)'
    : isRunning
      ? '1.6px solid var(--terra-deep)'
      : '1.6px solid var(--ink)';

  return (
    <div
      style={{
        border,
        background: bg,
        borderRadius: 5,
        padding: '10px 12px',
        minHeight: 56,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <span className="tiny">priority {slot}</span>
      <span
        className={cn('hand', isDone && 'strike')}
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: isDone ? 'var(--ink-faint)' : 'var(--ink)',
          lineHeight: 1.2,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {task.title}
      </span>
    </div>
  );
}
