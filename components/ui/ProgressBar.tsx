import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;  // 0–100+
  cap: number;    // reachable max for today — used for the aria-valuemax only.
                  // (Previously rendered as a faint sage "ghost" track via
                  // .bar-cap. Removed because its hard right edge produced a
                  // sub-pixel seam at fractional browser zoom. Same info is
                  // conveyed by the deficit text under the bar.)
  overGoal?: boolean;
  className?: string;
}

export function ProgressBar({ value, cap, overGoal = false, className }: ProgressBarProps) {
  const fillPct = Math.min(value, 100);

  return (
    <div
      className={cn('bar', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={cap}
    >
      <div
        className={cn('bar-fill', overGoal && 'over')}
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}
