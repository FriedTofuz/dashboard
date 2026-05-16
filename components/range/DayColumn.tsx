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
        'paper rounded-card p-3 col gap-2 min-h-[400px] transition-colors',
        isToday ? 'ink-box-sage' : 'ink-box-soft',
        droppable.isOver && 'wash-sage',
      )}
    >
      <button
        type="button"
        onClick={() => {
          setCurrentDayKey(dayKey);
          setView('today');
        }}
        className="row items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <div className="col gap-0">
          <span className="tiny">{weekday}</span>
          <span className="font-hand text-h3 leading-none">
            {isToday ? <span className="underline-hand">{monthDay}</span> : monthDay}
          </span>
        </div>
        <div style={{ width: 56, height: 84, marginRight: -8 }}>
          <Sunflower state={flowerState} size={56} />
        </div>
      </button>

      <div className="col gap-0.5">
        <div className="bar" style={{ height: 5 }}>
          <div className="bar-cap" style={{ width: `${progress.cap}%` }} />
          <div className="bar-fill" style={{ width: `${progress.value}%` }} />
        </div>
        <div className="row items-center justify-between">
          <span className="tiny">{progress.value}%</span>
          <span className="tiny">r3 {r3Done}/3</span>
        </div>
      </div>

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="col gap-0">
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
        <p className="muted caption italic text-center mt-4">
          — empty — drop a task here —
        </p>
      )}
    </div>
  );
}
