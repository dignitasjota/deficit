'use client';

import { MULTIPLICADOR_BEBIDA } from '@perdida-peso/domain';
import type { BebidaTipo, DailyEntryInput } from '@perdida-peso/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';
import { DateNav } from './date-nav';

const TODAY = () => new Date().toISOString().slice(0, 10);
const QUICK_VALUES = [0.33, 0.5, 1, 1.5] as const;

type SodiumUnit = 'g' | 'mg';

const VISIBLE_BEBIDAS: { tipo: BebidaTipo; label: string; tone: string; field: keyof DailyEntryInput }[] = [
  { tipo: 'agua', label: 'Agua', tone: 'var(--color-neon-cyan)', field: 'aguaL' },
  { tipo: 'cafe_te', label: 'Café/té', tone: 'var(--color-neon-yellow)', field: 'cafeTeL' },
  { tipo: 'refresco_zero', label: 'Refresco zero', tone: 'var(--color-neon-purple)', field: 'refrescoZeroL' },
];

export function HidratacionCard() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(TODAY);

  const entryQuery = useQuery({
    queryKey: queryKeys.entry(fecha),
    queryFn: () => api.getEntry(fecha),
  });
  const entry = entryQuery.data;

  const upsert = useMutation({
    mutationFn: (input: DailyEntryInput) => api.upsertEntry(fecha, input),
    onSuccess: () => invalidateAfterMutation(qc, fecha),
  });

  // Sodio
  const [sodioUnit, setSodioUnit] = useState<SodiumUnit>('g');
  const [sodioInput, setSodioInput] = useState('');
  useEffect(() => {
    if (entry === undefined) return;
    if (entry.sodioG === null) {
      setSodioInput('');
    } else {
      setSodioInput(
        sodioUnit === 'g' ? entry.sodioG.toString() : (entry.sodioG * 1000).toString(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.sodioG, sodioUnit]);

  function commitSodio() {
    if (sodioInput.trim() === '') {
      upsert.mutate({ sodioG: null });
      return;
    }
    const raw = Number.parseFloat(sodioInput);
    if (!Number.isFinite(raw) || raw < 0) return;
    const sodioG = sodioUnit === 'g' ? raw : raw / 1000;
    upsert.mutate({ sodioG });
  }

  function addLitros(field: keyof DailyEntryInput, current: number, delta: number) {
    upsert.mutate({ [field]: Math.max(0, current + delta) } as DailyEntryInput);
  }

  if (!entry) {
    return (
      <NeonCard tone="blue" title="HIDRATACIÓN HOY" symbol=",">
        <p style={{ color: 'var(--color-fg-subtle)' }}>cargando…</p>
      </NeonCard>
    );
  }

  const pct = entry.metaLitros > 0 ? Math.min(1, entry.litrosEfectivos / entry.metaLitros) : 0;
  const faltan = Math.max(0, entry.metaLitros - entry.litrosEfectivos);

  return (
    <NeonCard
      tone="blue"
      title="HIDRATACIÓN HOY"
      symbol=","
      cornerNote={
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-widest" style={{ color: 'var(--color-fg-muted)' }}>
            META: {entry.metaLitros.toFixed(2)}L
          </span>
          <DateNav fecha={fecha} onChange={setFecha} />
        </div>
      }
    >
      {/* Equivalente + barra */}
      <div className="text-right mb-2">
        <span
          className="text-xs uppercase tracking-widest mr-2"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          EQUIVALENTE
        </span>
        <span
          className="text-3xl tabular-nums neon-glow"
          style={{
            color: 'var(--color-neon-cyan)',
            fontFamily: 'var(--font-vt323)',
          }}
        >
          {entry.litrosEfectivos.toFixed(2)}
          <span className="text-base ml-1">L</span>
        </span>
      </div>
      <div
        className="relative h-3 w-full border overflow-hidden"
        style={{ borderColor: 'var(--color-neon-blue)' }}
      >
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
          style={{
            background: entry.metaCumplida
              ? 'var(--color-neon-green)'
              : 'var(--color-neon-blue)',
            boxShadow: '0 0 6px -2px currentColor',
          }}
        />
      </div>
      <div className="flex justify-between text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--color-fg-subtle)' }}>
        <span>0L</span>
        <span>
          {entry.metaCumplida ? (
            <span style={{ color: 'var(--color-neon-green)' }}>META CUMPLIDA ✓</span>
          ) : (
            `FALTAN ${faltan.toFixed(2)}L`
          )}
        </span>
        <span>{entry.metaLitros.toFixed(1)}L</span>
      </div>

      {/* Sodio */}
      <hr
        className="my-3 border-t border-dashed"
        style={{ borderColor: 'var(--color-border)' }}
      />
      <h3
        className="text-xl uppercase tracking-wider mb-1"
        style={{ color: 'var(--color-neon-orange)' }}
      >
        , Sodio hoy
        <span
          className="ml-3 text-base"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          base 2g · cada g extra → +250ml meta
        </span>
      </h3>
      <div className="grid grid-cols-[auto_auto_1fr] gap-2 items-center">
        <UnitSwitch unit="g" current={sodioUnit} onClick={setSodioUnit}>
          SAL(g)
        </UnitSwitch>
        <UnitSwitch unit="mg" current={sodioUnit} onClick={setSodioUnit}>
          SODIO(mg)
        </UnitSwitch>
        <Input
          type="number"
          step="0.1"
          min={0}
          value={sodioInput}
          onChange={(e) => setSodioInput(e.target.value)}
          onBlur={commitSodio}
          placeholder={sodioUnit === 'g' ? '2.0' : '2000'}
        />
      </div>

      {/* Bebidas */}
      <hr
        className="my-3 border-t border-dashed"
        style={{ borderColor: 'var(--color-border)' }}
      />
      <div className="space-y-3">
        {VISIBLE_BEBIDAS.map((b) => {
          const litros = Number(entry[b.field as keyof typeof entry] ?? 0);
          const mult = MULTIPLICADOR_BEBIDA[b.tipo];
          return (
            <div
              key={b.tipo}
              className="border p-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span
                  className="text-base uppercase tracking-wider"
                  style={{ color: b.tone }}
                >
                  ~ {b.label}{' '}
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    ({Math.round(mult * 100)}%)
                  </span>
                </span>
                <span
                  className="text-xl tabular-nums"
                  style={{ color: b.tone }}
                >
                  {litros.toFixed(2)} L
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {QUICK_VALUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => addLitros(b.field, litros, v)}
                    className="border px-2 py-1 text-base hover:neon-glow-soft"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-fg)',
                    }}
                  >
                    +{v}L
                  </button>
                ))}
              </div>
              {litros > 0 && (
                <button
                  type="button"
                  onClick={() => upsert.mutate({ [b.field]: 0 } as DailyEntryInput)}
                  className="text-base mt-1 underline opacity-60 hover:opacity-100"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  resetear
                </button>
              )}
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}

function UnitSwitch({
  unit,
  current,
  onClick,
  children,
}: {
  unit: SodiumUnit;
  current: SodiumUnit;
  onClick: (u: SodiumUnit) => void;
  children: React.ReactNode;
}) {
  const active = unit === current;
  return (
    <button
      type="button"
      onClick={() => onClick(unit)}
      className="border px-2 py-2 text-base uppercase tracking-widest"
      style={{
        borderColor: active ? 'var(--color-neon-orange)' : 'var(--color-border)',
        color: active ? 'var(--color-neon-orange)' : 'var(--color-fg-muted)',
      }}
    >
      {children}
    </button>
  );
}

function invalidateAfterMutation(
  qc: ReturnType<typeof useQueryClient>,
  fecha: string,
): void {
  void qc.invalidateQueries({ queryKey: queryKeys.entry(fecha) });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboardHeader });
  void qc.invalidateQueries({ queryKey: queryKeys.xpSummary });
}
