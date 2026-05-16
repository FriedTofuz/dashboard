export interface DeficitDelta {
  deltaSeconds: number;
  newDeficit: number;
}

/**
 * Apply one completed task to the running deficit tally.
 * Over estimate → overage rounded up to nearest minute added.
 * Under or equal → exactly 5 min relief, floor at 0.
 */
export function applyTaskToDeficit(
  estMinutes: number,
  actualMs: number,
  currentDeficitSeconds: number,
): DeficitDelta {
  const estSeconds = estMinutes * 60;
  const actualSeconds = actualMs / 1000;

  let delta: number;
  if (actualSeconds > estSeconds) {
    delta = Math.ceil((actualSeconds - estSeconds) / 60) * 60;
  } else {
    delta = -300; // exactly 5 min relief
  }

  const newDeficit = Math.max(0, currentDeficitSeconds + delta);
  return { deltaSeconds: delta, newDeficit };
}

export function formatDeficit(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `-${h}h ${m}m`;
  return `-${m}m`;
}
