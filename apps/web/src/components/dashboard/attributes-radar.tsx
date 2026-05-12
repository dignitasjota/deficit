'use client';

import type { AttributesSummary } from '@perdida-peso/schemas';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { NeonCard } from '@/components/ui/neon-card';
import { toneVar } from '@/lib/tones';

interface AttributesRadarProps {
  data: AttributesSummary;
}

/**
 * Card BALANCE con un RadarChart de los 9 atributos. La escala se
 * reajusta a 15/20/25/30+ según el atributo más alto. Replica imagen 3.
 */
export function AttributesRadar({ data }: AttributesRadarProps) {
  const max = Math.max(15, ...data.atributos.map((a) => a.valor));
  const ejeMax =
    max <= 15 ? 15 : max <= 20 ? 20 : max <= 25 ? 25 : Math.ceil(max / 5) * 5;

  const chartData = data.atributos.map((a) => ({
    code: a.code,
    nombre: a.nombre,
    valor: a.valor,
    color: toneVar(a.color),
  }));

  return (
    <NeonCard tone="green" title="BALANCE" symbol=",">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="80%">
            <PolarGrid
              stroke="var(--color-border-strong)"
              gridType="polygon"
              radialLines
            />
            <PolarAngleAxis
              dataKey="code"
              tick={({ payload, x, y, textAnchor }) => {
                const code = payload.value as string;
                const fill = chartData.find((c) => c.code === code)?.color ?? 'var(--color-fg)';
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor={textAnchor}
                    fill={fill}
                    fontFamily="var(--font-vt323)"
                    fontSize={14}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    {code}
                  </text>
                );
              }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, ejeMax]}
              tick={{ fill: 'var(--color-fg-subtle)', fontSize: 10 }}
              stroke="var(--color-border)"
              tickCount={4}
            />
            <Radar
              dataKey="valor"
              stroke="var(--color-neon-orange)"
              strokeWidth={1.5}
              fill="var(--color-neon-orange)"
              fillOpacity={0.18}
              dot={{ r: 3, fill: 'var(--color-neon-orange)', stroke: 'var(--color-bg)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-neon-cyan)',
                fontFamily: 'var(--font-vt323)',
                fontSize: 14,
              }}
              labelFormatter={(label) => {
                const item = chartData.find((c) => c.code === label);
                return item ? `${item.code} · ${item.nombre}` : String(label);
              }}
              formatter={(value: number) => [`${value}`, 'puntos']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p
        className="text-center text-base mt-1"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        max eje: {ejeMax}
      </p>
    </NeonCard>
  );
}
