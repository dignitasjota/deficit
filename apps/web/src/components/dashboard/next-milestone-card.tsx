'use client';

import type { XpSummary } from '@perdida-peso/schemas';
import { NeonCard } from '@/components/ui/neon-card';

interface NextMilestoneCardProps {
  data: XpSummary;
}

/**
 * Card SIG. HITO con el nombre del próximo hito, su nivel objetivo y la
 * XP que falta. Cuando el usuario ha cumplido todos los hitos (L80),
 * muestra "JEFE FINAL SUPERADO".
 */
export function NextMilestoneCard({ data }: NextMilestoneCardProps) {
  if (data.jefeFinalSuperado || data.proximoHito === null) {
    return (
      <NeonCard tone="purple" title="SIG. HITO" symbol=",">
        <p
          className="text-3xl uppercase tracking-widest neon-glow"
          style={{ color: 'var(--color-neon-purple)' }}
        >
          JEFE FINAL SUPERADO
        </p>
        <p
          className="text-base mt-1"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Has alcanzado los 80 niveles. ¡Felicidades!
        </p>
      </NeonCard>
    );
  }

  const hito = data.proximoHito;

  return (
    <NeonCard
      tone="red"
      title="SIG. HITO"
      symbol=","
      cornerNote={
        <span className="flex flex-col items-end">
          <span style={{ color: 'var(--color-neon-red)' }}>XP FALTA</span>
        </span>
      }
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p
            className="text-3xl uppercase tracking-wider neon-glow"
            style={{
              color: 'var(--color-neon-red)',
              fontFamily: 'var(--font-vt323)',
            }}
          >
            {hito.nombre}
          </p>
          <p
            className="text-base mt-0.5"
            style={{ color: 'color-mix(in oklch, var(--color-neon-red) 60%, var(--color-fg-subtle))' }}
          >
            NVL {hito.nivel}
          </p>
        </div>
        <p
          className="text-3xl tabular-nums"
          style={{
            color: 'var(--color-neon-red)',
            fontFamily: 'var(--font-vt323)',
          }}
        >
          {Math.ceil(data.xpFaltaHito).toLocaleString('es-ES')}
        </p>
      </div>
    </NeonCard>
  );
}
