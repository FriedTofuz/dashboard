'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getDb,
  type HabitTemplate,
  type WorkoutData,
  type WorkoutExercise,
} from '@/lib/idb/db';
import { createHabit, updateHabit, deleteHabit } from '@/lib/idb/habits';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast } from '@/lib/store/useToastStore';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

interface BodyProps {
  userId: string;
  /** Optional explicit close handler — shown as a "close" link in the
   *  header when this body is rendered inside the legacy modal overlay.
   *  Settings-embedded mode omits it (no header close button). */
  onClose?: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Visual order with Monday first; storage indices stay JS-standard (Sun=0). */
const WEEK_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];

function newExerciseId(): string {
  return crypto.randomUUID();
}

/** Empty workout plan — every weekday starts blank. */
function emptyWorkoutData(): WorkoutData {
  const data: WorkoutData = {};
  for (let i = 0; i < 7; i++) data[i] = { title: '', exercises: [] };
  return data;
}

export function HabitTemplatesEditor({ userId }: Props) {
  const open = useUiStore((s) => s.habitsEditorOpen);
  const setOpen = useUiStore((s) => s.setHabitsEditorOpen);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="ink-box paper rounded-card p-6 max-w-2xl w-full col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <HabitTemplatesEditorBody userId={userId} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

/** Editor body — reusable inside a modal or embedded in the Settings panel. */
export function HabitTemplatesEditorBody({ userId, onClose }: BodyProps) {
  const habits = useLiveQuery(
    () => getDb().habit_templates.where('user_id').equals(userId).toArray(),
    [userId],
    [],
  );

  const [editing, setEditing] = useState<HabitTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [workoutDay, setWorkoutDay] = useState(1); // Monday default

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
      kind: 'habit',
      workout_data: null,
      created_at: Date.now(),
    });
    setIsNew(true);
  }

  function startNewWorkout() {
    setEditing({
      id: '',
      user_id: userId,
      title: 'Gym',
      est_minutes: 60,
      recurrence: 'weekday',
      recurrence_days: null,
      weight: 1,
      active: true,
      sort_order: 0,
      kind: 'workout',
      workout_data: emptyWorkoutData(),
      created_at: Date.now(),
    });
    setIsNew(true);
    setWorkoutDay(1);
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
          kind: editing.kind,
          workout_data: editing.workout_data,
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
    const ok = await themedConfirm({
      title: `delete habit "${editing.title}"?`,
      body: 'past instances stay; no new ones will be generated.',
      confirmLabel: 'delete habit',
      cancelLabel: 'keep it',
      danger: true,
    });
    if (!ok) return;
    await deleteHabit(editing.id);
    toast(`habit "${editing.title}" deleted`);
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

  // ── Workout-data helpers ───────────────────────────────────────────────

  function updateWorkoutDay(updater: (plan: { title?: string; exercises: WorkoutExercise[] }) => { title?: string; exercises: WorkoutExercise[] }) {
    if (!editing) return;
    const wd: WorkoutData = { ...(editing.workout_data ?? emptyWorkoutData()) };
    const current = wd[workoutDay] ?? { title: '', exercises: [] };
    wd[workoutDay] = updater(current);
    setEditing({ ...editing, workout_data: wd });
  }

  function addExercise() {
    updateWorkoutDay((plan) => ({
      ...plan,
      exercises: [
        ...plan.exercises,
        { id: newExerciseId(), name: '', sets: 3, reps: 10 },
      ],
    }));
  }

  function updateExercise(id: string, changes: Partial<WorkoutExercise>) {
    updateWorkoutDay((plan) => ({
      ...plan,
      exercises: plan.exercises.map((ex) => (ex.id === id ? { ...ex, ...changes } : ex)),
    }));
  }

  function removeExercise(id: string) {
    updateWorkoutDay((plan) => ({
      ...plan,
      exercises: plan.exercises.filter((ex) => ex.id !== id),
    }));
  }

  const currentPlan = editing?.workout_data?.[workoutDay] ?? { title: '', exercises: [] };

  return (
    <div className="col gap-4 w-full">
      <div className="row items-center justify-between">
        <h2 className="font-hand text-h2">habits</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="tiny">close</button>
        )}
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
                  <span className="row items-center" style={{ gap: 8 }}>
                    {h.kind === 'workout' && (
                      <span
                        className="tiny"
                        style={{
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: 'var(--ochre-tint)',
                          color: 'var(--ochre-deep)',
                          letterSpacing: '0.08em',
                        }}
                      >
                        workout
                      </span>
                    )}
                    <span className="font-hand text-body">{h.title}</span>
                  </span>
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

            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={startNew}
                className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
              >
                + add habit
              </button>
              <button
                type="button"
                onClick={startNewWorkout}
                className="ink-box-soft font-hand text-body-sm px-4 py-1.5 transition-colors"
                style={{
                  borderColor: 'var(--ochre-deep)',
                  background: 'var(--ochre-tint)',
                  color: 'var(--ochre-deep)',
                }}
              >
                + add workout
              </button>
            </div>
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
                placeholder={editing.kind === 'workout' ? 'Gym' : 'morning walk…'}
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
                  {WEEK_ORDER.map((d) => (
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
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Workout plan editor ──────────────────────────────────── */}
            {editing.kind === 'workout' && (
              <div className="col gap-2" style={{ marginTop: 4 }}>
                <div className="row items-baseline justify-between">
                  <label className="tiny">workout plan</label>
                  <span className="tiny muted">
                    tap a day · empty days are rest days
                  </span>
                </div>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                  {WEEK_ORDER.map((d) => {
                    const label = DAY_LABELS[d];
                    const hasPlan =
                      (editing.workout_data?.[d]?.exercises.length ?? 0) > 0;
                    const isSelected = d === workoutDay;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setWorkoutDay(d)}
                        className="font-hand text-body-sm px-3 py-1.5 rounded-card transition-colors"
                        style={{
                          border: '1.5px solid',
                          borderColor: isSelected
                            ? 'var(--ochre-deep)'
                            : 'var(--ink-soft)',
                          background: isSelected
                            ? 'var(--ochre-tint)'
                            : hasPlan
                              ? 'var(--paper-warm)'
                              : 'transparent',
                          color: isSelected
                            ? 'var(--ochre-deep)'
                            : hasPlan
                              ? 'var(--ink)'
                              : 'var(--ink-faint)',
                        }}
                      >
                        {label}
                        {hasPlan && (
                          <span
                            style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}
                          >
                            ·{editing.workout_data?.[d]?.exercises.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="col gap-2" style={{ marginTop: 6 }}>
                  <input
                    type="text"
                    value={currentPlan.title ?? ''}
                    onChange={(e) =>
                      updateWorkoutDay((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder={`${DAY_LABELS[workoutDay]} focus (e.g. "Leg day")`}
                    className="font-hand text-body bg-transparent border-b py-1 focus:outline-none"
                    style={{ borderColor: 'var(--ink-faint)' }}
                  />

                  {currentPlan.exercises.length === 0 ? (
                    <p
                      className="hand muted italic"
                      style={{ fontSize: 16, padding: '6px 0' }}
                    >
                      rest day — tap below to add exercises
                    </p>
                  ) : (
                    <div className="col" style={{ gap: 6 }}>
                      {currentPlan.exercises.map((ex) => (
                        <div
                          key={ex.id}
                          className="row items-center"
                          style={{ gap: 6, flexWrap: 'wrap' }}
                        >
                          <input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                sets: Number(e.target.value) || 1,
                              })
                            }
                            className="ui num"
                            style={{
                              width: 44,
                              border: '1.5px solid var(--ink-soft)',
                              borderRadius: 4,
                              padding: '4px 6px',
                              background: 'var(--paper)',
                              fontSize: 13,
                              textAlign: 'center',
                              outline: 'none',
                            }}
                            aria-label="sets"
                          />
                          <span className="ui muted" style={{ fontSize: 13 }}>×</span>
                          <input
                            type="number"
                            min={1}
                            value={ex.reps}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                reps: Number(e.target.value) || 1,
                              })
                            }
                            className="ui num"
                            style={{
                              width: 50,
                              border: '1.5px solid var(--ink-soft)',
                              borderRadius: 4,
                              padding: '4px 6px',
                              background: 'var(--paper)',
                              fontSize: 13,
                              textAlign: 'center',
                              outline: 'none',
                            }}
                            aria-label="reps"
                          />
                          <input
                            type="text"
                            value={ex.name}
                            onChange={(e) =>
                              updateExercise(ex.id, { name: e.target.value })
                            }
                            placeholder="exercise name"
                            className="hand"
                            style={{
                              flex: 1,
                              minWidth: 140,
                              border: 'none',
                              borderBottom: '1.5px solid var(--ink-faint)',
                              background: 'transparent',
                              fontSize: 17,
                              padding: '2px 4px',
                              outline: 'none',
                            }}
                          />
                          <input
                            type="text"
                            value={ex.weight ?? ''}
                            onChange={(e) =>
                              updateExercise(ex.id, { weight: e.target.value })
                            }
                            placeholder="weight"
                            className="ui"
                            style={{
                              width: 80,
                              border: '1.5px solid var(--ink-soft)',
                              borderRadius: 4,
                              padding: '4px 6px',
                              background: 'var(--paper)',
                              fontSize: 12,
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeExercise(ex.id)}
                            aria-label="remove exercise"
                            className="hover:bg-paper-warm transition-colors"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--terra-deep)',
                              padding: 4,
                              borderRadius: 3,
                              cursor: 'pointer',
                              fontSize: 14,
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addExercise}
                    className="ink-box-soft font-hand text-body-sm px-3 py-1 transition-colors self-start"
                    style={{
                      borderColor: 'var(--ochre-deep)',
                      color: 'var(--ochre-deep)',
                    }}
                  >
                    + add exercise
                  </button>
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
  );
}
