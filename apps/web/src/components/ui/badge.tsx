import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2 py-0.5 text-base font-[family-name:var(--font-vt323)] uppercase tracking-wider',
  {
    variants: {
      tone: {
        green: 'text-[color:var(--color-neon-green)] border-[color:var(--color-neon-green)]',
        orange: 'text-[color:var(--color-neon-orange)] border-[color:var(--color-neon-orange)]',
        cyan: 'text-[color:var(--color-neon-cyan)] border-[color:var(--color-neon-cyan)]',
        red: 'text-[color:var(--color-neon-red)] border-[color:var(--color-neon-red)]',
        purple: 'text-[color:var(--color-neon-purple)] border-[color:var(--color-neon-purple)]',
        yellow: 'text-[color:var(--color-neon-yellow)] border-[color:var(--color-neon-yellow)]',
        muted: 'text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]',
      },
    },
    defaultVariants: { tone: 'cyan' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
