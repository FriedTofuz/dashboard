'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type HabitTemplate } from '@/lib/idb/db';
import { createHabit, updateHabit, deleteHabit } from '@/lib/idb/habits';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitTemplatesEditor({ userId }: Props) {
  const open = useUiStore((s) => s.habitsEditorOpen);
  const setOpen = useUiStore((s) => s.setHabitsEditorOpen);

  const habits = useLiveQuery(
    () => getDb().habit_templates.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  const [editing, setEditing] = useState<HabitTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  if (!open) return null;

  function startNew() {
    setEditing({
      id: '',
      user_id: userId,
      title: '',
      est_minutes: 10,
      recurrence: 'daily',
      recurrence_days: null,
      weight: 1,
      active: true,
      sort_order: 0,
      created_at: Date.now(),
    });
    setIsNew(true);
  }

  async function save() {
    if (!editing || !editing.title.trim()) return;
    if (isNew) {
      await createHabit(
        {
          title: editing.title.trim(),
          est_minutes: editing.est_minutes,
          recurrence: editing.recurrence,
          recurrence_days: editing.recurrence_days,
          weight: editing.weight,
          active: editing.active,
          sort_order: editing.sort_order,
        },
        userId,
      );
    } else {
      await updateHabit(editing.id, editing);
    }
    setEditing(null);
    setIsNew(false);
  }

  async function remove() {
    if (!editing || isNew) return;
    if (!confirm(`Delete habit "${editing.title}"? Past instances stay.`)) return;
    await deleteHabit(editing.id);
    setEditing(null);
  }

  function toggleDay(d: number) {
    if (!editing) return;
    const days = editing.recurrence_days ?? [];
    setEditing({
      ...editing,
      recurrence_days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={() => {
        setOpen(false);
        setEditing(null);
      }}
    >
      <div
        className="ink-box paper rounded-card p-6 max-w-lg w-full col gap-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row items-center justify-between">
          <h2 className="font-hand text-h2">habits</h2>
          <button type="button" onClick={() => setOpen(false)} className="tiny">close</button>
        </div>

        {!editing && (
          <>
            <div className="col gap-1">
              {(habits ?? []).length === 0 && (
                <p className="muted caption italic">no habits yet — add your first.</p>
              )}
              {(habits ?? []).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setEditing(h);
                    setIsNew(false);
                  }}
                  className={cn(
                    'row items-center justify-between text-left py-2 px-2 rounded-card hover:wash-sage',
                    !h.active && 'opacity-50',
                  )}
                >
                  <span className="font-hand text-body">{h.title}</span>
                  <span className="tiny">
                    {h.recurrence}
                    {h.recurrence === 'weekly' && h.recurrence_days
                      ? ` · ${h.recurrence_days.map((d) => DAY_LABELS[d]).join(' ')}`
                      : ''}
                    {' · '}
                    {h.est_minutes}m
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={startNew}
              className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors self-start"
            >
              + add habit
            </button>
          </>
        )}

        {editing && (
          <div className="col gap-3">
            <div className="col gap-1">
              <label className="tiny">title</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                autoFocus
                placeholder="morning walk…"
                className="font-hand text-body bg-transparent border-b py-1 focus:outline-none"
                style={{ borderColor: 'var(--ink-faint)' }}
              />
            </div>

            <div className="row gap-3">
              <div className="col gap-1 flex-1">
                <label className="tiny">est minutes</label>
                <input
                  type="number"
                  min={1}
                  value={editing.est_minutes}
                  onChange={(e) =>
                    setEditing({ ...editing, est_minutes: Number(e.target.value) || 10 })
                  }
                  className="font-hand text-body bg-transparent border-b py-1 focus:outline-none w-20"
                  style={{ borderColor: 'var(--ink-faint)' }}
                />
              </div>
              <div className="col gap-1 flex-1">
                <label className="tiny">weight</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={editing.weight}
                  onChange={(e) =>
                    setEditing({ ...editing, weight: Number(e.target.value) || 1 })
                  }
                  className="font-hand text-body bg-transparent border-b py-1 focus:outline-none w-20"
                  style={{ borderColor: 'var(--ink-faint)' }}
                />
              </div>
            </div>

            <div className="col gap-1">
              <label className="tiny">recurrence</label>
              <div className="row gap-1.5">
                {(['daily', 'weekday', 'weekly'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        recurrence: r,
                        recurrence_days: r === 'weekly' ? editing.recurrence_days ?? [] : null,
                      })
                    }
                    className={cn(
                      'font-hand text-body-sm px-3 py-1 rounded-card',
                      editing.recurrence === r ? 'wash-terra ink-box-terra' : 'ink-box-soft',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {editing.recurrence === 'weekly' && (
              <div className="col gap-1">
                <label className="tiny">days</label>
                <div className="row gap-1">
                  {DAY_LABELS.map((label, d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        'font-hand text-body-sm px-2 py-1 rounded-card',
                        editing.recurrence_days?.includes(d)
                          ? 'wash-sage ink-box-sage'
                          : 'ink-box-soft',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="row items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              <label htmlFor="active" className="font-hand text-body-sm">
                active
              </label>
            </div>

            <div className="row gap-2 mt-2">
              <button
                type="button"
                onClick={save}
                className="ink-box font-hand text-body px-4 py-1.5 hover:wash-sage transition-colors"
              >
                save
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={remove}
                  className="ink-box-soft font-hand text-body-sm px-3 py-1.5 hover:wash-terra transition-colors text-terra"
                >
                  delete
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setIsNew(false);
                }}
                className="tiny ml-auto"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
