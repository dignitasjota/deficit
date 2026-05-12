'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex w-full items-stretch gap-px border-b font-[family-name:var(--font-vt323)]',
      className,
    )}
    style={{ borderColor: 'var(--color-border-strong)' }}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TONE_VAR = {
  green: 'var(--color-neon-green)',
  cyan: 'var(--color-neon-cyan)',
  pink: 'var(--color-neon-pink)',
  orange: 'var(--color-neon-orange)',
  purple: 'var(--color-neon-purple)',
} as const;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    tone?: keyof typeof TONE_VAR;
  }
>(({ className, tone = 'cyan', ...props }, ref) => {
  const color = TONE_VAR[tone];
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex-1 px-3 py-2 text-base uppercase tracking-widest',
        'transition-all border-b-2 -mb-px',
        'data-[state=inactive]:opacity-50 data-[state=inactive]:hover:opacity-90',
        'data-[state=inactive]:border-transparent',
        'data-[state=active]:opacity-100',
        'data-[state=active]:border-b-[color:var(--tab-active-border-color)]',
        'data-[state=active]:bg-[color:var(--tab-active-bg)]',
        'data-[state=active]:neon-glow-soft',
        'focus:outline-none focus-neon',
        className,
      )}
      style={
        {
          color,
          '--tab-active-border-color': color,
          '--tab-active-bg': `color-mix(in oklch, ${color} 10%, transparent)`,
        } as React.CSSProperties
      }
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-3 focus:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
