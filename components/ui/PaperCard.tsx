import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Variant = 'default' | 'soft' | 'sage' | 'terra' | 'dashed';

interface PaperCardProps {
  children: ReactNode;
  variant?: Variant;
  ruled?: boolean;
  ruledDense?: boolean;
  ruledMargin?: boolean;
  dotGrid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantClass: Record<Variant, string> = {
  default: 'ink-box',
  soft:    'ink-box-soft',
  sage:    'ink-box-sage',
  terra:   'ink-box-terra',
  dashed:  'ink-box-dashed',
};

export function PaperCard({
  children,
  variant = 'soft',
  ruled,
  ruledDense,
  ruledMargin,
  dotGrid,
  className,
  style,
}: PaperCardProps) {
  return (
    <div
      className={cn(
        'paper relative',
        variantClass[variant],
        ruled && 'ruled',
        ruledDense && 'ruled-dense',
        ruledMargin && 'ruled-margin',
        dotGrid && 'dotgrid',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
