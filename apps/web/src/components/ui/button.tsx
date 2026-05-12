'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Button con look terminal: borde de color, texto upper, transición
 * suave en hover. Variants para los distintos colores neón.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-[family-name:var(--font-vt323)] uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:focus-neon',
  {
    variants: {
      variant: {
        primary:
          'border-2 hover:bg-[color:var(--color-neon-orange)]/10 hover:neon-glow-soft',
        secondary:
          'border hover:bg-[color:var(--color-neon-cyan)]/10 hover:neon-glow-soft',
        ghost:
          'border-0 underline underline-offset-4 hover:neon-glow-soft',
        danger:
          'border-2 hover:bg-[color:var(--color-neon-red)]/10 hover:neon-glow-soft',
      },
      tone: {
        green: 'text-[color:var(--color-neon-green)] border-[color:var(--color-neon-green)]',
        orange: 'text-[color:var(--color-neon-orange)] border-[color:var(--color-neon-orange)]',
        cyan: 'text-[color:var(--color-neon-cyan)] border-[color:var(--color-neon-cyan)]',
        purple: 'text-[color:var(--color-neon-purple)] border-[color:var(--color-neon-purple)]',
        red: 'text-[color:var(--color-neon-red)] border-[color:var(--color-neon-red)]',
        muted: 'text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]',
      },
      size: {
        sm: 'text-base px-3 py-1.5',
        md: 'text-xl px-4 py-2.5',
        lg: 'text-2xl px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      tone: 'orange',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, tone, size, asChild = false, loading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, tone, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? '…procesando' : children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
