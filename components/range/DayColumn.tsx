'use client';

import { useDroppable } from '@dnd-kit/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getDb } from '@/lib/idb/db';
import { TaskRow } from '@/components/tasks/TaskRow';
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
        .sortBy('sort_order'),
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

  const r3 = list.filter((t) => t.r3_slot != null);
  const others = list.filter((t) => t.r3_slot == null && t.state !== 'done');
  const done = list.filter((t) => t.r3_slot == null && t.state === 'done');

  const sortableIds = [...others, ...done].map((t) => `task-${t.id}`);

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
        gap: 10,
        minHeight: 420,
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
        <div style={{ width: 56, height: 84, marginRight: -8 }}>
          <Sunflower state={flowerState} size={56} />
        </div>
      </button>

      <div className="col" style={{ gap: 4 }}>
        <div className="bar" style={{ height: 6 }}>
          <div className="bar-cap" style={{ width: `${progress.cap}%` }} />
          <div className="bar-fill" style={{ width: `${progress.value}%` }} />
        </div>
        <div className="row items-center justify-between">
          <span className="tiny num">{progress.value}%</span>
          <span className="tiny num">r3 {r3Done}/3</span>
        </div>
      </div>

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="col" style={{ gap: 0 }}>
          {r3.map((t) => (
            <TaskRow key={t.id} task={t} showNumber={false} draggable={false} />
          ))}
          {others.map((t) => (
            <TaskRow key={t.id} task={t} showNumber={false} />
          ))}
          {done.map((t) => (
            <TaskRow key={t.id} task={t} showNumber={false} />
          ))}
        </div>
      </SortableContext>

      {list.length === 0 && (
        <p
          className="hand"
          style={{
            color: 'var(--ink-faint)',
            textAlign: 'center',
            marginTop: 12,
            fontSize: 18,
          }}
        >
          — empty — drop a task here —
        </p>
      )}
    </div>
  );
}
