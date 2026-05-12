'use client';

import type { WeightChartPoint, WeightChartRange } from '@perdida-peso/schemas';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';

const RANGES: { value: WeightChartRange; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'all', label: 'Todo' },
];

const MESES_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function formatTickX(iso: string): string {
  const [, m, d] = iso.split('-');
  const monthIdx = Number.parseInt(m ?? '1', 10) - 1;
  return `${Number.parseInt(d ?? '1', 10)} ${MESES_ES[monthIdx] ?? ''}`;
}

/**
 * EVOLUCIÓN DE PESO (imagen 2). 4 series en un ComposedChart:
 *   1. Banda sombreada del rango esperado (Area gris translúcida).
 *   2. Peso real (naranja con puntos).
 *   3. Media móvil 7d (cian sólida).
 *   4. Peso teórico (verde dashed).
 *
 * Filtros 7/30/90/Todo arriba a la derecha. Header con MIN/MAX/Δ.
 */
export function WeightChartCard() {
  const { api } = useAuth();
  const [range, setRange] = useState<WeightChartRange>('30d');

  const query = useQuery({
    queryKey: queryKeys.weightChart(range),
    queryFn: () => api.getWeightChart(range),
  });

  const data = query.data;

  return (
    <NeonCard
      tone="green"
      title="EVOLUCIÓN DE PESO"
      symbol=","
      cornerNote={
        <div className="flex gap-1">
          {RANGES.map((r) => {
            const active = r.value === range;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className="border px-2 py-0.5 text-xs uppercase tracking-widest"
                style={{
                  borderColor: active ? 'var(--color-neon-orange)' : 'var(--color-border)',
                  color: active ? 'var(--color-neon-orange)' : 'var(--color-fg-muted)',
                  background: active
                    ? 'color-mix(in oklch, var(--color-neon-orange) 12%, transparent)'
                    : undefined,
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      }
    >
      {/* Header con stats */}
      {data && (
        <div className="flex gap-6 mb-3 text-base">
          <Stat label="MIN" value={fmtKg(data.stats.min)} tone="cyan" />
          <Stat label="MAX" value={fmtKg(data.stats.max)} tone="orange" />
          <Stat
            label="Δ"
            value={data.stats.delta !== null ? fmtSigned(data.stats.delta) : '—'}
            tone={data.stats.delta !== null && data.stats.delta < 0 ? 'green' : 'red'}
          />
        </div>
      )}

      <div className="h-72 w-full">
        {!data ? (
          <div
            className="h-full flex items-center justify-center text-base"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            cargando…
          </div>
        ) : data.puntos.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-base"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            no hay datos en este rango
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.puntos} margin={{ top: 10, right: 12, bottom: 4, left: -10 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="fecha"
                tickFormatter={formatTickX}
                tick={{
                  fill: 'var(--color-fg-muted)',
                  fontFamily: 'var(--font-vt323)',
                  fontSize: 12,
                }}
                stroke="var(--color-border)"
                minTickGap={28}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(1)}
                tick={{
                  fill: 'var(--color-fg-muted)',
                  fontFamily: 'var(--font-vt323)',
                  fontSize: 12,
                }}
                stroke="var(--color-border)"
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              {/* Banda sombreada del rango esperado */}
              <Area
                type="monotone"
                dataKey={(d: WeightChartPoint) => [d.rangoMin, d.rangoMax]}
                fill="var(--color-fg-subtle)"
                fillOpacity={0.18}
                stroke="none"
                isAnimationActive={false}
                connectNulls
                name="Rango esperado"
              />
              {/* Peso teórico (verde dashed) */}
              <Line
                type="monotone"
                dataKey="pesoTeorico"
                stroke="var(--color-neon-green)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
                name="Teórico (XP)"
              />
              {/* Media móvil 7d (cian sólida) */}
              <Line
                type="monotone"
                dataKey="media7d"
                stroke="var(--color-neon-cyan)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
                name="Media 7 días"
              />
              {/* Peso real (naranja con puntos) */}
              <Line
                type="monotone"
                dataKey="pesoReal"
                stroke="var(--color-neon-orange)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: 'var(--color-neon-orange)', stroke: 'var(--color-bg)' }}
                isAnimationActive={false}
                connectNulls
                name="Peso real"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leyenda inferior */}
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-base"
        style={{ fontFamily: 'var(--font-vt323)' }}
      >
        <LegendItem color="var(--color-neon-cyan)" label="Media 7 días" />
        <LegendItem color="var(--color-neon-orange)" label="Peso real" />
        <LegendItem color="var(--color-fg-subtle)" label="Rango esperado" />
        <LegendItem color="var(--color-neon-green)" label="Teórico (XP)" dashed />
      </div>
    </NeonCard>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cyan' | 'orange' | 'green' | 'red';
}) {
  const colorMap = {
    cyan: 'var(--color-neon-cyan)',
    orange: 'var(--color-neon-orange)',
    green: 'var(--color-neon-green)',
    red: 'var(--color-neon-red)',
  } as const;
  return (
    <span className="flex items-baseline gap-1.5 font-[family-name:var(--font-vt323)]">
      <span className="uppercase tracking-widest" style={{ color: 'var(--color-fg-subtle)' }}>
        {label}
      </span>
      <span className="text-xl tabular-nums" style={{ color: colorMap[tone] }}>
        {value}
      </span>
    </span>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block w-6 h-0"
        style={{
          borderTop: dashed ? `1px dashed ${color}` : `2px solid ${color}`,
          boxShadow: `0 0 4px -1px ${color}`,
        }}
      />
      <span style={{ color: 'var(--color-fg-muted)' }}>{label}</span>
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | number[]; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div
      className="border px-3 py-2 font-[family-name:var(--font-vt323)] text-base"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-neon-cyan)',
      }}
    >
      <p className="mb-1" style={{ color: 'var(--color-neon-cyan)' }}>
        {formatTickX(label)}
      </p>
      {payload.map((p) => {
        const display = Array.isArray(p.value)
          ? `${p.value[0]?.toFixed(1)} – ${p.value[1]?.toFixed(1)} kg`
          : typeof p.value === 'number'
            ? `${p.value.toFixed(1)} kg`
            : '—';
        return (
          <p key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color ?? 'var(--color-fg-muted)' }}>{p.name}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-fg)' }}>
              {display}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function fmtKg(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(1)} kg`;
}

function fmtSigned(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)} kg`;
}
