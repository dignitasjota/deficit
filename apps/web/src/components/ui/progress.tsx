'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Color del relleno (variable CSS). Por defecto naranja neón. */
  tone?: 'green' | 'orange' | 'cyan' | 'purple' | 'red' | 'yellow';
  shimmer?: boolean;
}

const TONES: Record<NonNullable<ProgressProps['tone']>, string> = {
  green: 'var(--color-neon-green)',
  orange: 'var(--color-neon-orange)',
  cyan: 'var(--color-neon-cyan)',
  purple: 'var(--color-neon-purple)',
  red: 'var(--color-neon-red)',
  yellow: 'var(--color-neon-yellow)',
};

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, tone = 'orange', shimmer = false, ...props }, ref) => {
    const color = TONES[tone];
    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative h-5 w-full overflow-hidden border',
          'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]',
          className,
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full transition-all', shimmer && 'neon-shimmer')}
          style={{
            width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
            backgroundColor: shimmer ? undefined : color,
            color,
            boxShadow: `0 0 6px -1px ${color}`,
          }}
        />
      </ProgressPrimitive.Root>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
