/** Shared "heat" color logic for per-day progress visualizations.
 *
 *  Used by:
 *  - StatsCard streak strip
 *  - TopBar date-pill background tint
 *
 *  Default palette: red → yellow → green (0 → 50 → 100 %).
 *  Berkeley accent:  pale blue → mid blue → Berkeley blue. */

const NEUTRAL_WASH = 'rgba(180, 170, 158, 0.18)';

export function heatColor(
  pct: number,
  hasContent: boolean,
  logged: boolean,
  berkeley: boolean,
): string {
  if (!hasContent || !logged) {
    // Empty / habit-only day OR unlogged day — neutral wash, no opinion.
    return NEUTRAL_WASH;
  }
  const p = Math.max(0, Math.min(100, pct));

  let lowStop: number[];
  let midStop: number[];
  let highStop: number[];

  if (berkeley) {
    lowStop  = [196, 208, 230]; // #C4D0E6 — pale blue
    midStop  = [ 95, 121, 175]; // #5F79AF — mid blue
    highStop = [  0,  38, 118]; // #002676 — Berkeley blue
  } else {
    lowStop  = [207,  79,  58]; // red
    midStop  = [232, 176,  72]; // yellow
    highStop = [107, 138,  92]; // green
  }

  let from: number[];
  let to: number[];
  let t: number;
  if (p <= 50) {
    from = lowStop;
    to = midStop;
    t = p / 50;
  } else {
    from = midStop;
    to = highStop;
    t = (p - 50) / 50;
  }
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function heatBorder(
  pct: number,
  hasContent: boolean,
  logged: boolean,
  berkeley: boolean,
): string {
  if (!hasContent || !logged) return '1px solid var(--ink-faint)';
  return `1px solid ${heatColor(pct, true, true, berkeley)}`;
}

/** True when the heat color is dark enough that foreground text should flip
 *  to paper (the light surface color) for legibility.
 *
 *  Heuristic, not a precise contrast calc: in either palette the upper
 *  third of the gradient is dark enough that ink-on-tint loses contrast.
 *  (Default green at 100% has luminance ~0.20; Berkeley blue at 100% has
 *  luminance ~0.04.) Berkeley actually crosses the legibility threshold
 *  slightly earlier, but a single cutoff keeps the visual rhythm
 *  consistent across themes. */
export function heatNeedsLightText(
  pct: number,
  hasContent: boolean,
  logged: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _berkeley: boolean,
): boolean {
  if (!hasContent || !logged) return false;
  return pct >= 65;
}
