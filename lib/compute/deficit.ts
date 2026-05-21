export interface DeficitDelta {
  deltaSeconds: number;
  newDeficit: number;
}

/**
 * Compute the deficit delta for a completed task.
 *
 * Over estimate → overage rounded UP to nearest minute, added to deficit.
 * Under estimate → savings rounded DOWN to nearest minute, subtracted from
 *                   deficit (floor at 0).
 *
 * Symmetric and reversible: `applyTaskToDeficit` returns a delta and
 * `reverseTaskFromDeficit` returns the negation, so check / uncheck /
 * recheck cycles balance to zero (modulo the floor-at-0 clamp).
 */
export function applyTaskToDeficit(
  estMinutes: number,
  actualMs: number,
  currentDeficitSeconds: number,
): DeficitDelta {
  const delta = deltaForTask(estMinutes, actualMs);
  const newDeficit = Math.max(0, currentDeficitSeconds + delta);
  return { deltaSeconds: delta, newDeficit };
}

/** Reverse a previously-applied delta (used on uncomplete). */
export function reverseTaskFromDeficit(
  estMinutes: number,
  actualMs: number,
  currentDeficitSeconds: number,
): DeficitDelta {
  const delta = -deltaForTask(estMinutes, actualMs);
  const newDeficit = Math.max(0, currentDeficitSeconds + delta);
  return { deltaSeconds: delta, newDeficit };
}

/** Raw delta in seconds for one completed task. Positive = overage. */
function deltaForTask(estMinutes: number, actualMs: number): number {
  const estSeconds = estMinutes * 60;
  const actualSeconds = actualMs / 1000;
  if (actualSeconds > estSeconds) {
    return Math.ceil((actualSeconds - estSeconds) / 60) * 60;
  }
  return -Math.floor((estSeconds - actualSeconds) / 60) * 60;
}

export function formatDeficit(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `-${h}h ${m}m`;
  return `-${m}m`;
}
