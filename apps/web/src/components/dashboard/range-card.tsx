'use client';

import type { DashboardHeader, EstadoBascula } from '@perdida-peso/schemas';
import { Badge } from '@/components/ui/badge';
import { NeonCard } from '@/components/ui/neon-card';

interface RangeCardProps {
  data: DashboardHeader;
}

const ESTADO_LABEL: Record<EstadoBascula, { label: string; tone: 'green' | 'red' | 'orange' | 'cyan' }> = {
  DENTRO: { label: 'DENTRO DEL RANGO ✓', tone: 'green' },
  FUERA_ARRIBA: { label: 'FUERA DEL RANGO ↑', tone: 'red' },
  FUERA_ABAJO: { label: 'FUERA DEL RANGO ↓', tone: 'orange' },
  NO_REGISTRADO: { label: 'PESO NO REGISTRADO', tone: 'cyan' },
};

/**
 * Card RANGO ESPERADO con rango grande, badge de estado y desglose de
 * retención. Replica imagen 1 panel central derecho.
 */
export function RangeCard({ data }: RangeCardProps) {
  const { rangoEsperado: r, sodioG } = data;
  const estado = ESTADO_LABEL[r.estadoBascula];

  return (
    <NeonCard
      tone="cyan"
      title="RANGO ESPERADO"
      symbol=","
      cornerNote="modelo retención"
    >
      <div className="text-center">
        <p
          className="text-5xl tabular-nums neon-glow"
          style={{
            color: 'var(--color-neon-cyan)',
            fontFamily: 'var(--font-vt323)',
          }}
        >
          {r.rangoMin.toFixed(1)} – {r.rangoMax.toFixed(1)}
          <span className="text-2xl ml-1">kg</span>
        </p>
        <div className="mt-2 flex justify-center">
          <Badge tone={estado.tone} className="anim-pulse-neon">
            {estado.label}
          </Badge>
        </div>
      </div>

      <hr
        className="my-4 border-t border-dashed"
        style={{ borderColor: 'var(--color-border)' }}
      />

      <div className="space-y-1 text-base">
        <div className="flex items-baseline justify-between">
          <span
            className="uppercase tracking-wide"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Retención hoy
          </span>
          <span
            className="text-xl tabular-nums"
            style={{ color: 'var(--color-fg)' }}
          >
            +{r.retencion.retTotal.toFixed(1)} kg
          </span>
        </div>
        <BreakdownRow
          label="Sodio"
          tooltip={`${sodioG.toFixed(1)} g · base 2 g`}
          value={r.retencion.retSodio}
          color="var(--color-neon-yellow)"
        />
        <BreakdownRow
          label="Glucógeno (sin carbos)"
          value={r.retencion.retGlucogeno}
          color="var(--color-neon-cyan)"
        />
        <BreakdownRow
          label="Digestivo"
          value={r.retencion.retDigestivo}
          color="var(--color-neon-purple)"
        />
        {r.baselineDrift !== null && (
          <div className="flex items-baseline justify-between pt-2 mt-2 border-t border-dashed"
            style={{ borderColor: 'var(--color-border)' }}>
            <span
              className="uppercase tracking-wide"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              Media vs baseline {Math.abs(r.baselineDrift).toFixed(1)}
            </span>
            <span
              className="tabular-nums"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              {r.baselineDrift >= 0 ? '+' : ''}
              {r.baselineDrift.toFixed(1)} kg
            </span>
          </div>
        )}
      </div>
    </NeonCard>
  );
}

function BreakdownRow({
  label,
  tooltip,
  value,
  color,
}: {
  label: string;
  tooltip?: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="flex items-baseline gap-2">
        <span style={{ color }}>{label}</span>
        {tooltip && (
          <span
            className="text-sm"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            {tooltip}
          </span>
        )}
      </span>
      <span className="tabular-nums" style={{ color }}>
        +{value.toFixed(1)} kg
      </span>
    </div>
  );
}
