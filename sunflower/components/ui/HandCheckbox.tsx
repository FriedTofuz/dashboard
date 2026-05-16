'use client';

import { cn } from '@/lib/utils';

type CheckboxState = 'open' | 'running' | 'done';

interface HandCheckboxProps {
  state: CheckboxState;
  onClick?: () => void;
  size?: number;
  className?: string;
}

export function HandCheckbox({ state, onClick, size = 18, className }: HandCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={state === 'done' ? 'Mark incomplete' : 'Mark complete'}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={cn(
        'box relative flex-shrink-0 cursor-pointer bg-transparent border-none p-0 focus-visible:outline-terra',
        state === 'done' && 'checked',
        state === 'running' && 'timer',
        className,
      )}
    />
  );
}
