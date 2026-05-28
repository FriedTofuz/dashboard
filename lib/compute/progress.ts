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
  // (1) Rule of 3 — 50% slice, distributed evenly: each of the 3 slots is worth
  // 50/3 ≈ 16.67%. A slot counts as done only when the parent task is in
  // `state: 'done'` (subtasks within an R3 don't earn partial R3 credit — the
  // task is either crossed off or it isn't).
  const r3Tasks = tasks.filter((t) => t.r3_slot != null);
  const r3DoneCount = r3Tasks.filter((t) => t.state === 'done').length;
  const r3Pts = (r3DoneCount / 3) * 50;

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

  // Renormalize against only the categories that exist today — empty habits
  // or empty "others" shouldn't make 100% unreachable. R3 is always part of
  // the denominator (its empty-slot weighting already enforces the rule that
  // <3 R3 tasks done can never hit 100%).
  const totalAvailable =
    50 +
    (habits.length > 0 ? 25 : 0) +
    (others.length > 0 ? 25 : 0);
  const rawPoints = r3Pts + habitPts + otherPts;
  const value = totalAvailable === 0
    ? 0
    : Math.round((rawPoints / totalAvailable) * 100);

  return {
    value,
    // `cap` is preserved for downstream callers — after renormalization it's
    // always 100 (max reachable is the full bar), since dropping empty
    // categories from the denominator removes their unreachable slice.
    cap: 100,
    r3Pts,
    habitPts,
    otherPts,
  };
}
