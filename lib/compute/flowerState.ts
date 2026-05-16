export type FlowerState = 'thriving' | 'healthy' | 'drooping' | 'wilting';

export interface FlowerInput {
  /** Most recent days first. */
  recentDays: Array<{
    r3Done: number;     // 0–3
    bonusDone: number;  // completed non-R3 tasks count
    progressPct: number;
  }>;
  currentDeficitSeconds: number;
  consecutiveZeroR3Days: number;
}

/**
 * v1 placeholder formula — polish in Week 3.
 * Cumulative (no daily reset): uses a 3-day weighted average of R3 completion.
 */
export function computeFlowerState(input: FlowerInput): FlowerState {
  if (input.consecutiveZeroR3Days >= 3) return 'wilting';

  const weights = [3, 2, 1];
  const days = input.recentDays.slice(0, 3);
  let weightedR3 = 0;
  let totalW = 0;

  days.forEach((d, i) => {
    const w = weights[i] ?? 1;
    weightedR3 += (d.r3Done / 3) * w;
    totalW += w;
  });

  const r3Rate = totalW > 0 ? weightedR3 / totalW : 0;
  const deficitMin = input.currentDeficitSeconds / 60;
  const today = days[0];

  if (r3Rate >= 1 && (today?.bonusDone ?? 0) >= 1) return 'thriving';
  if (r3Rate >= 0.5 && deficitMin < 30) return 'healthy';
  if (r3Rate >= 0.25 || deficitMin < 90) return 'drooping';
  return 'wilting';
}

export function consecutiveZeroR3Days(
  recentDays: Array<{ r3Done: number }>,
): number {
  let count = 0;
  for (const d of recentDays) {
    if (d.r3Done === 0) count++;
    else break;
  }
  return count;
}
