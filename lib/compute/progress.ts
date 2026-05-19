export interface SubtaskForProgress {
  done: boolean;
}

export interface TaskForProgress {
  state: 'open' | 'running' | 'paused' | 'done';
  r3_slot: 1 | 2 | 3 | null;
  est_minutes: number;
  template_id: string | null;
  weight?: number | null;
  skipped?: boolean;
  /** Optional subtask checklist — when present, scales the task's weight and
   *  contributes partial done-credit per completed item. */
  subtasks?: SubtaskForProgress[] | null;
}

export interface ProgressResult {
  value: number;  // 0–100 whole number
  cap: number;    // max reachable today (50, 75, or 100)
  r3Pts: number;
  habitPts: number;
  otherPts: number;
}

/** Multiplier on a task's category weight based on subtask count. A task with
 *  N subtasks counts max(1, N) times more than one without. */
function subtaskWeight(t: TaskForProgress): number {
  const n = t.subtasks?.length ?? 0;
  return n > 0 ? n : 1;
}

/** Fraction of this task that's "done" — 1 if `state === 'done'`, otherwise
 *  the share of subtasks marked done. Tasks without subtasks return 0 until
 *  completed. */
function doneFraction(t: TaskForProgress): number {
  if (t.state === 'done') return 1;
  const subs = t.subtasks ?? [];
  if (subs.length === 0) return 0;
  const done = subs.filter((s) => s.done).length;
  return done / subs.length;
}

export function progressForDay(tasks: TaskForProgress[]): ProgressResult {
  // (1) Rule of 3 — 50% slice, 3 slots. Each slot's weight scales with its
  // task's subtask count; empty slots contribute weight 1.
  const r3Tasks = tasks.filter((t) => t.r3_slot != null);
  const r3SlotsFilled = r3Tasks.length;
  const emptyR3Slots = Math.max(0, 3 - r3SlotsFilled);
  const r3WeightTotal =
    r3Tasks.reduce((s, t) => s + subtaskWeight(t), 0) + emptyR3Slots;
  const r3WeightDone = r3Tasks.reduce(
    (s, t) => s + subtaskWeight(t) * doneFraction(t),
    0,
  );
  const r3Pts = r3WeightTotal === 0 ? 0 : (r3WeightDone / r3WeightTotal) * 50;

  // (2) Habits — 25% slice, weighted by habit_templates.weight × subtask scale.
  const habits = tasks.filter(
    (t) => t.template_id != null && !t.skipped && t.r3_slot == null,
  );
  const habitTotalW = habits.reduce(
    (s, t) => s + (t.weight ?? 1) * subtaskWeight(t),
    0,
  );
  const habitDoneW = habits.reduce(
    (s, t) => s + (t.weight ?? 1) * subtaskWeight(t) * doneFraction(t),
    0,
  );
  const habitPts = habitTotalW === 0 ? 0 : (habitDoneW / habitTotalW) * 25;

  // (3) Other one-off tasks — 25% slice, weighted by est_minutes × subtask scale.
  const others = tasks.filter(
    (t) => t.template_id == null && t.r3_slot == null && !t.skipped,
  );
  const othTotalW = others.reduce(
    (s, t) => s + t.est_minutes * subtaskWeight(t),
    0,
  );
  const othDoneW = others.reduce(
    (s, t) => s + t.est_minutes * subtaskWeight(t) * doneFraction(t),
    0,
  );
  const otherPts = othTotalW === 0 ? 0 : (othDoneW / othTotalW) * 25;

  // Cap = points reachable today — empty categories leave their slice unreachable
  const cap =
    50 +
    (habits.length > 0 ? 25 : 0) +
    (others.length > 0 ? 25 : 0);

  return {
    value: Math.round(r3Pts + habitPts + otherPts),
    cap,
    r3Pts,
    habitPts,
    otherPts,
  };
}
