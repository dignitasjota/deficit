'use client';

import type { XpSummary } from '@perdida-peso/schemas';
import { motion } from 'framer-motion';
import { NeonCard } from '@/components/ui/neon-card';

interface LevelPathCardProps {
  data: XpSummary;
}

const TOTAL_SEGMENTOS = 80;

/**
 * Card CAMINO TOTAL con barra segmentada L0→L80. La parte alcanzada
 * luce en morado neón con glow; la pendiente queda como rejilla vacía.
 * Replica la imagen 1 del sistema original (barra inferior morada).
 */
export function LevelPathCard({ data }: LevelPathCardProps) {
  const completos = Math.max(0, Math.min(TOTAL_SEGMENTOS, data.nivelActual));
  const pctRecorrido = (completos / TOTAL_SEGMENTOS) * 100;
  // Posición fraccional dentro del nivel actual para colorear el segmento parcial.
  const fracActual = completos < TOTAL_SEGMENTOS ? data.progresoPct : 0;

  return (
    <NeonCard
      tone="purple"
      title="CAMINO TOTAL"
      symbol=","
      cornerNote={
        <span className="tabular-nums" style={{ color: 'var(--color-neon-purple)' }}>
          NVL {completos} / 80
        </span>
      }
    >
      <div className="relative">
        <div className="grid h-7 w-full gap-px" style={gridStyle}>
          {Array.from({ length: TOTAL_SEGMENTOS }, (_, i) => {
            const filled = i < completos;
            const partial = i === completos && fracActual > 0;
            return (
              <div
                key={i}
                className="h-full"
                style={{
                  background: filled
                    ? 'var(--color-neon-purple)'
                    : 'color-mix(in oklch, var(--color-bg-elevated) 80%, transparent)',
                  borderTop: '1px solid var(--color-neon-purple)',
                  borderBottom: '1px solid var(--color-neon-purple)',
                  boxShadow: filled
                    ? 'inset 0 0 4px color-mix(in oklch, var(--color-neon-magenta) 60%, white)'
                    : undefined,
                }}
              >
                {partial && (
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${fracActual * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.4 }}
                    style={{
                      background: 'var(--color-neon-purple)',
                      boxShadow: '0 0 4px var(--color-neon-magenta)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Porcentaje superpuesto centrado en el medio de la parte rellena */}
        {pctRecorrido > 6 && (
          <span
            className="absolute top-0 h-7 flex items-center text-xl tabular-nums neon-glow-soft"
            style={{
              left: 0,
              width: `${pctRecorrido}%`,
              justifyContent: 'center',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-vt323)',
              pointerEvents: 'none',
            }}
          >
            {pctRecorrido.toFixed(1)}%
          </span>
        )}
      </div>

      <div
        className="mt-2 flex items-baseline justify-between text-base uppercase tracking-widest"
        style={{
          color: 'color-mix(in oklch, var(--color-neon-pink) 80%, var(--color-fg-muted))',
          fontFamily: 'var(--font-vt323)',
        }}
      >
        <span>INICIO</span>
        {data.proximoHito && data.proximoHito.nivel < 80 && (
          <span
            className="tabular-nums"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            sig. hito @ NVL {data.proximoHito.nivel}
          </span>
        )}
        <span>JEFE FINAL</span>
      </div>
    </NeonCard>
  );
}

const gridStyle: React.CSSProperties = {
  gridTemplateColumns: `repeat(${TOTAL_SEGMENTOS}, minmax(0, 1fr))`,
};
