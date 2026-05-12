'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-transparent border px-3 py-2 text-xl outline-none transition-all',
          'border-[color:var(--color-neon-green)] text-[color:var(--color-fg)]',
          'placeholder:text-[color:var(--color-fg-subtle)]',
          'focus:focus-neon focus:text-[color:var(--color-neon-green)]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
