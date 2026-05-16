export interface TaskForProgress {
  state: 'open' | 'running' | 'paused' | 'done';
  r3_slot: 1 | 2 | 3 | null;
  est_minutes: number;
  template_id: string | null;
  weight?: number | null;
  skipped?: boolean;
}

export interface ProgressResult {
  value: number;  // 0–100 whole number
  cap: number;    // max reachable today (50, 75, or 100)
  r3Pts: number;
  habitPts: number;
  otherPts: number;
}

export function progressForDay(tasks: TaskForProgress[]): ProgressResult {
  // (1) Rule of 3 — 50 % slice, 3 slots
  const r3Done = tasks.filter(t => t.r3_slot != null && t.state === 'done').length;
  const r3Pts = (r3Done / 3) * 50;

  // (2) Habits — 25 % slice, weighted by habit_templates.weight
  const habits = tasks.filter(
    t => t.template_id != null && !t.skipped && t.r3_slot == null,
  );
  const habitTotalW = habits.reduce((s, t) => s + (t.weight ?? 1), 0);
  const habitDoneW = habits
    .filter(t => t.state === 'done')
    .reduce((s, t) => s + (t.weight ?? 1), 0);
  const habitPts = habitTotalW === 0 ? 0 : (habitDoneW / habitTotalW) * 25;

  // (3) Other one-off tasks — 25 % slice, weighted by est_minutes
  const others = tasks.filter(
    t => t.template_id == null && t.r3_slot == null && !t.skipped,
  );
  const othEst = others.reduce((s, t) => s + t.est_minutes, 0);
  const othDone = others
    .filter(t => t.state === 'done')
    .reduce((s, t) => s + t.est_minutes, 0);
  const otherPts = othEst === 0 ? 0 : (othDone / othEst) * 25;

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
