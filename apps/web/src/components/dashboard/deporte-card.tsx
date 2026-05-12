'use client';

import { ApiError } from '@perdida-peso/api-client';
import { calcStepXP, KCAL_POR_PASO_FACTOR, TOPE_PASOS_DIARIO } from '@perdida-peso/domain';
import type { ExerciseLog } from '@perdida-peso/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';
import { DateNav } from './date-nav';

interface DeporteCardProps {
  /** Peso báscula actual del usuario (último registrado o pesoInicial). */
  pesoKg: number;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

type ExerciseTab = 'ejercicio' | 'caminata';

export function DeporteCard({ pesoKg }: DeporteCardProps) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(TODAY);
  const [tab, setTab] = useState<ExerciseTab>('ejercicio');

  const entryQuery = useQuery({
    queryKey: queryKeys.entry(fecha),
    queryFn: () => api.getEntry(fecha),
  });
  const exercisesQuery = useQuery({
    queryKey: queryKeys.exercises(fecha),
    queryFn: () => api.listExercises(fecha),
  });

  const entry = entryQuery.data;

  const upsertEntry = useMutation({
    mutationFn: (input: Parameters<typeof api.upsertEntry>[1]) => api.upsertEntry(fecha, input),
    onSuccess: () => invalidateAfterMutation(qc, fecha),
  });

  const addEx = useMutation({
    mutationFn: (input: Parameters<typeof api.addExercise>[1]) => api.addExercise(fecha, input),
    onSuccess: () => invalidateAfterMutation(qc, fecha),
  });

  const delEx = useMutation({
    mutationFn: (id: string) => api.deleteExercise(fecha, id),
    onSuccess: () => invalidateAfterMutation(qc, fecha),
  });

  // Pasos
  const [pasosInput, setPasosInput] = useState<string>('');
  const pasosNum = Number.parseInt(pasosInput, 10);
  const pasosValido = Number.isFinite(pasosNum) && pasosNum >= 0;
  const pasosComputables = pasosValido ? Math.min(pasosNum, TOPE_PASOS_DIARIO) : 0;
  const xpEstimadoPasos = pasosValido ? calcStepXP(pasosComputables, pesoKg) : 0;
  const pasosCerrados = entry?.pasosCerrados !== null && entry?.pasosCerrados !== undefined;

  // Ejercicio form
  const [exNombre, setExNombre] = useState('');
  const [exKcal, setExKcal] = useState('');
  const [exMin, setExMin] = useState('');

  function syncPasos() {
    const value = pasosInput.trim() === '' ? null : pasosNum;
    upsertEntry.mutate({ pasos: value });
  }

  function cerrarPasos() {
    upsertEntry.mutate({ pasosCerrados: true });
  }

  function onAddExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!exNombre.trim()) return;
    addEx.mutate({
      tipo: tab,
      nombre: exNombre.trim(),
      kcalQuemadas: exKcal !== '' ? Number(exKcal) : null,
      minutos: exMin !== '' ? Number(exMin) : null,
    });
    setExNombre('');
    setExKcal('');
    setExMin('');
  }

  // Sincronizar pasos input cuando cambia la fecha o se carga la entry.
  useSyncedInput(setPasosInput, entry?.pasos ?? null);

  const ejercicios = exercisesQuery.data ?? [];
  const ejerciciosDelTab = ejercicios.filter((e) => e.tipo === tab);

  return (
    <NeonCard
      tone="cyan"
      title="DEPORTE HOY"
      symbol=","
      cornerNote={<DateNav fecha={fecha} onChange={setFecha} />}
    >
      {/* Pasos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[color:var(--color-neon-green)]">PASOS</Label>
          <Input
            type="number"
            min={0}
            max={200_000}
            value={pasosInput}
            onChange={(e) => setPasosInput(e.target.value)}
            onBlur={syncPasos}
            placeholder="0"
          />
        </div>
        <div>
          <Label className="text-[color:var(--color-neon-orange)]">XP A GANAR</Label>
          <div
            className="border px-3 py-2 text-xl tabular-nums"
            style={{
              borderColor: 'var(--color-neon-orange)',
              color: 'var(--color-neon-orange)',
            }}
          >
            +{xpEstimadoPasos}
          </div>
        </div>
      </div>
      <p
        className="text-base mt-1 font-[family-name:var(--font-jetbrains)]"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {pasosComputables} × {pesoKg.toFixed(0)} × {KCAL_POR_PASO_FACTOR} = {xpEstimadoPasos} XP
        {pasosValido && pasosNum > TOPE_PASOS_DIARIO && (
          <span style={{ color: 'var(--color-neon-yellow)' }}>
            {' '}
            (tope {TOPE_PASOS_DIARIO} aplicado)
          </span>
        )}
      </p>

      <Button
        type="button"
        variant="primary"
        tone="green"
        className="w-full mt-3"
        onClick={cerrarPasos}
        disabled={pasosCerrados || upsertEntry.isPending}
      >
        {pasosCerrados ? '[ pasos cerrados ✓ ]' : '[ ▸ CERRAR PASOS ]'}
      </Button>

      <hr
        className="my-4 border-t border-dashed"
        style={{ borderColor: 'var(--color-border)' }}
      />

      {/* Ejercicios */}
      <h3
        className="text-xl uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        , Ejercicios
      </h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Tab tab="ejercicio" current={tab} onClick={setTab}>
          × EJERCICIO
        </Tab>
        <Tab tab="caminata" current={tab} onClick={setTab}>
          ◯ CAMINATA
        </Tab>
      </div>

      <form onSubmit={onAddExercise} className="space-y-2">
        <Input
          placeholder={
            tab === 'ejercicio'
              ? 'Ludosport, fuerza, bici, gym…'
              : 'Caminata mañana, paseo perro…'
          }
          value={exNombre}
          onChange={(e) => setExNombre(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="kcal"
            type="number"
            min={0}
            max={10_000}
            value={exKcal}
            onChange={(e) => setExKcal(e.target.value)}
          />
          <Input
            placeholder="min"
            type="number"
            min={0}
            max={600}
            value={exMin}
            onChange={(e) => setExMin(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          tone="cyan"
          className="w-full"
          loading={addEx.isPending}
          disabled={!exNombre.trim()}
        >
          ▸ AÑADIR {tab.toUpperCase()}
        </Button>
      </form>

      <ul className="mt-3 space-y-1">
        {ejerciciosDelTab.length === 0 && (
          <li
            className="text-base text-center opacity-60"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            sin {tab === 'ejercicio' ? 'ejercicios' : 'caminatas'}
          </li>
        )}
        {ejerciciosDelTab.map((ex) => (
          <ExerciseRow
            key={ex.id}
            ex={ex}
            onDelete={() => delEx.mutate(ex.id)}
            disabled={delEx.isPending}
          />
        ))}
      </ul>
    </NeonCard>
  );
}

function Tab({
  tab,
  current,
  onClick,
  children,
}: {
  tab: ExerciseTab;
  current: ExerciseTab;
  onClick: (t: ExerciseTab) => void;
  children: React.ReactNode;
}) {
  const active = tab === current;
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className="border px-3 py-2 text-base uppercase tracking-widest transition-all"
      style={{
        borderColor: active ? 'var(--color-neon-cyan)' : 'var(--color-border)',
        color: active ? 'var(--color-neon-cyan)' : 'var(--color-fg-muted)',
        boxShadow: active ? '0 0 8px -2px var(--color-neon-cyan)' : undefined,
      }}
    >
      {children}
    </button>
  );
}

function ExerciseRow({
  ex,
  onDelete,
  disabled,
}: {
  ex: ExerciseLog;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <li
      className="flex items-center justify-between border px-3 py-1.5 text-base"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-col leading-tight">
        <span style={{ color: 'var(--color-fg)' }}>{ex.nombre}</span>
        <span style={{ color: 'var(--color-fg-subtle)' }}>
          {ex.minutos !== null && `${ex.minutos}min`}
          {ex.kcalQuemadas !== null && ` · ${ex.kcalQuemadas} kcal`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {ex.xpOtorgada > 0 && (
          <span
            className="tabular-nums"
            style={{ color: 'var(--color-neon-orange)' }}
          >
            +{ex.xpOtorgada}
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Eliminar"
          className="opacity-60 hover:opacity-100 hover:text-[color:var(--color-neon-red)] disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/**
 * Refleja el último valor del backend en el input cuando cambia la fecha.
 * Cualquier edición local del usuario lo sobreescribe.
 */
function useSyncedInput<T>(setter: (v: string) => void, value: T | null): void {
  const cur = value === null || value === undefined ? '' : String(value);
  useEffect(() => {
    setter(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);
}

function invalidateAfterMutation(
  qc: ReturnType<typeof useQueryClient>,
  fecha: string,
): void {
  void qc.invalidateQueries({ queryKey: queryKeys.entry(fecha) });
  void qc.invalidateQueries({ queryKey: queryKeys.exercises(fecha) });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboardHeader });
  void qc.invalidateQueries({ queryKey: queryKeys.xpSummary });
}
