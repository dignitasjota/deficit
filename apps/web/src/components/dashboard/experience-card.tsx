'use client';

import type { XpSummary } from '@perdida-peso/schemas';
import { motion } from 'framer-motion';
import { NeonCard } from '@/components/ui/neon-card';

interface ExperienceCardProps {
  data: XpSummary;
}

/**
 * Card EXPERIENCIA con la barra amarilla y porcentaje grande dentro.
 * Replica la imagen 1: "EXPERIENCIA  86.1%  6626/7700".
 */
export function ExperienceCard({ data }: ExperienceCardProps) {
  const pct = data.progresoPct * 100;
  const diasFalta = data.xpDiaEstimado > 0 ? data.xpFalta / data.xpDiaEstimado : Infinity;

  return (
    <NeonCard
      tone="green"
      title="EXPERIENCIA"
      symbol=","
      cornerNote={
        <span style={{ color: 'var(--color-fg-muted)' }}>
          <span style={{ color: 'var(--color-neon-orange)' }}>{Math.floor(data.xpEnNivel)}</span>
          {' / '}
          <span>{Math.floor(data.xpPorNivel)}</span>
        </span>
      }
    >
      <div
        className="relative h-7 w-full border overflow-hidden"
        style={{
          borderColor: 'var(--color-neon-yellow)',
          background: 'color-mix(in oklch, var(--color-bg-elevated) 80%, transparent)',
        }}
      >
        <motion.div
          className="h-full neon-shimmer"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          style={{
            color: 'var(--color-neon-yellow)',
            boxShadow: '0 0 10px -2px var(--color-neon-yellow)',
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-xl tabular-nums neon-glow-soft"
          style={{
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-vt323)',
          }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        className="mt-3 flex items-baseline justify-between text-xl"
        style={{ fontFamily: 'var(--font-vt323)' }}
      >
        <span
          className="uppercase tracking-wide"
          style={{ color: 'var(--color-neon-green)' }}
        >
          ▸ Sig. nivel
        </span>
        <span
          className="tabular-nums"
          style={{ color: 'var(--color-fg)' }}
        >
          {Math.ceil(data.xpFalta)} XP{' '}
          <span style={{ color: 'var(--color-fg-subtle)' }}>
            (~{formatDias(diasFalta)})
          </span>
        </span>
      </div>
    </NeonCard>
  );
}

function formatDias(d: number): string {
  if (!Number.isFinite(d) || d <= 0) return '—';
  if (d < 1) return '<1d';
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 7)}sem`;
  return `${(d / 365).toFixed(1)}a`;
}
