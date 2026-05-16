import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;  // 0–100
  cap: number;    // 50, 75, or 100 — ghost fill shows the unreachable portion
  className?: string;
}

export function ProgressBar({ value, cap, className }: ProgressBarProps) {
  const fillPct = Math.min(value, 100);
  const capPct  = Math.min(cap, 100);

  return (
    <div className={cn('bar', className)} role="progressbar" aria-valuenow={value} aria-valuemax={cap}>
      {/* Ghost fill — shows the cap ceiling */}
      {capPct < 100 && (
        <div className="bar-cap" style={{ width: `${capPct}%` }} />
      )}
      {/* Actual fill */}
      <div className="bar-fill" style={{ width: `${fillPct}%` }} />
    </div>
  );
}
