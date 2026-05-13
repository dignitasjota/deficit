'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from './faq-data';

export function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-[color:var(--color-bg-elevated)] focus:outline-none focus-neon"
              aria-expanded={isOpen}
            >
              <span
                className="font-[family-name:var(--font-vt323)] text-xl"
                style={{
                  color: isOpen
                    ? 'var(--color-neon-cyan)'
                    : 'var(--color-fg)',
                }}
              >
                {item.q}
              </span>
              <span
                className="font-[family-name:var(--font-vt323)] text-2xl shrink-0"
                style={{ color: 'var(--color-neon-cyan)' }}
                aria-hidden="true"
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <p
                className="border-t px-3 py-3 font-[family-name:var(--font-vt323)] text-lg leading-relaxed"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-fg-muted)',
                }}
              >
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
