'use client';

import Link from 'next/link';

/**
 * Placeholder que sustituye una card Premium cuando el usuario está
 * en plan Free (post-trial). Mantiene el espacio visual y muestra
 * CTA a /pricing.
 */
export function PremiumLockedCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="relative overflow-hidden border border-dashed p-4 font-[family-name:var(--font-vt323)]"
      style={{
        borderColor: 'var(--color-neon-orange)',
        background: 'color-mix(in oklch, var(--color-neon-orange) 6%, transparent)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-xl uppercase tracking-wider"
          style={{ color: 'var(--color-neon-orange)' }}
        >
          ◆ {title}
        </h2>
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--color-neon-orange)' }}
        >
          PREMIUM
        </span>
      </div>
      <p
        className="mt-2 text-base"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {description}
      </p>
      <Link
        href="/pricing"
        className="mt-3 inline-block border px-3 py-1 text-base uppercase tracking-widest"
        style={{
          color: 'var(--color-neon-orange)',
          borderColor: 'var(--color-neon-orange)',
          background: 'color-mix(in oklch, var(--color-neon-orange) 12%, transparent)',
        }}
      >
        [ Desbloquear ]
      </Link>
    </div>
  );
}
