'use client';

import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getDb } from '@/lib/idb/db';
import { setR3Slot, moveTaskToDay, reorderTask } from '@/lib/idb/tasks';
import type { Task } from '@/lib/idb/db';

interface DndProviderProps {
  children: ReactNode;
}

/** Parsed target id from a droppable: r3-N, day-YYYY-MM-DD, task-<id>. */
type DropTarget =
  | { kind: 'r3'; slot: 1 | 2 | 3; dayKey: string }
  | { kind: 'day'; dayKey: string }
  | { kind: 'task'; id: string }
  | { kind: 'unknown' };

function parseDropId(id: string): DropTarget {
  if (id.startsWith('r3-')) {
    const [, slotStr, ...rest] = id.split('-');
    const dayKey = rest.join('-');
    return { kind: 'r3', slot: Number(slotStr) as 1 | 2 | 3, dayKey };
  }
  if (id.startsWith('day-')) {
    return { kind: 'day', dayKey: id.slice(4) };
  }
  if (id.startsWith('task-')) {
    return { kind: 'task', id: id.slice(5) };
  }
  return { kind: 'unknown' };
}

export function DndProvider({ children }: DndProviderProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Captured at drag-start so the preview can match the original element's
  // width — without this, the cursor would float off a too-narrow preview.
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith('task-')) {
      const taskId = id.slice(5);
      const task = await getDb().tasks.get(taskId);
      setActiveTask(task ?? null);
      const rect = e.active.rect.current.initial;
      if (rect) setActiveRect({ width: rect.width, height: rect.height });
      else setActiveRect(null);
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    setActiveRect(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith('task-')) return;
    const taskId = activeId.slice(5);

    const target = parseDropId(overId);

    if (target.kind === 'r3') {
      await setR3Slot(taskId, target.slot, target.dayKey);
      return;
    }

    if (target.kind === 'day') {
      // moveTaskToDay also clears r3_slot, so this handles both a same-day
      // demotion out of R3 (dropping a R3 card onto the empty Tasks zone)
      // and a cross-day move (dropping onto a different day's pill).
      await moveTaskToDay(taskId, target.dayKey);
      return;
    }

    if (target.kind === 'task' && target.id !== taskId) {
      const db = getDb();
      const overTask = await db.tasks.get(target.id);
      const activeTask = await db.tasks.get(taskId);
      if (!overTask || !activeTask || overTask.day_key !== activeTask.day_key) return;

      // If the active task is in R3 and the target is a regular task, drop it
      // out of R3 first. Lets the user drag an R3 priority back into the
      // regular Tasks list to demote it.
      const droppingOutOfR3 = activeTask.r3_slot != null && overTask.r3_slot == null;
      if (droppingOutOfR3 && overTask.day_key) {
        await setR3Slot(taskId, null, overTask.day_key);
      }

      const siblings = await db.tasks
        .where('day_key')
        .equals(overTask.day_key ?? '')
        .filter(
          (t) => !t.archived && t.template_id == null && t.r3_slot == null && t.state !== 'done',
        )
        .sortBy('sort_order');

      const overIdx = siblings.findIndex((t) => t.id === overTask.id);
      const activeIdx = siblings.findIndex((t) => t.id === taskId);
      const isMovingDown = activeIdx >= 0 && activeIdx < overIdx;

      const before = isMovingDown ? siblings[overIdx] : siblings[overIdx - 1];
      const after = isMovingDown ? siblings[overIdx + 1] : siblings[overIdx];

      await reorderTask(
        taskId,
        before && before.id !== taskId ? before.sort_order : null,
        after && after.id !== taskId ? after.sort_order : null,
      );
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {children}
      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)',
        }}
      >
        {activeTask && <DragPreview task={activeTask} rect={activeRect} />}
      </DragOverlay>
    </DndContext>
  );
}

/** Preview rendered under the cursor. Sized to match the original element's
 *  bounding rect so the cursor stays at the same point relative to the
 *  preview as it did on the source row. */
function DragPreview({ task, rect }: { task: Task; rect: { width: number; height: number } | null }) {
  const isR3 = task.r3_slot != null;

  if (isR3) {
    return (
      <div
        className="paper wobble col"
        style={{
          width: rect?.width ?? 260,
          minHeight: rect?.height ?? 132,
          padding: '16px 18px 14px',
          background: 'var(--sage-wash)',
          border: '1.6px solid var(--ink)',
          borderRadius: 5,
          boxShadow: '0 12px 28px rgba(28,24,20,0.25)',
          transform: 'rotate(-1.5deg)',
          cursor: 'grabbing',
        }}
      >
        <div className="row items-start justify-between">
          <span className="tiny">priority {task.r3_slot}</span>
        </div>
        <span
          className="hand"
          style={{ fontSize: 20, lineHeight: 1.1, color: 'var(--ink)', marginTop: 'auto' }}
        >
          {task.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className="paper wobble"
      style={{
        border: '1.5px solid var(--ink)',
        borderRadius: 5,
        padding: '8px 14px',
        background: 'var(--paper)',
        boxShadow: '0 8px 20px rgba(28,24,20,0.2)',
        transform: 'rotate(-1.5deg)',
        cursor: 'grabbing',
        whiteSpace: 'nowrap',
        width: rect?.width,
        minHeight: rect?.height,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span className="hand" style={{ fontSize: 18, color: 'var(--ink)' }}>
        {task.title}
      </span>
    </div>
  );
}
