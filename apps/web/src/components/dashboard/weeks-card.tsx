'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { EstadoSemanaWire, WeekStatus } from '@perdida-peso/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';

const META_SEMANAL = 7700;

interface WeeksCardProps {
  data: {
    semanas: WeekStatus[];
    colchonTotal: number;
    semanasOk: number;
    semanasTotales: number;
  };
}

const ESTADO_TONE: Record<EstadoSemanaWire, { label: string; color: string }> = {
  EN_CURSO: { label: 'EN CURSO', color: 'var(--color-neon-orange)' },
  COMPENSADA: { label: 'COMPENSADA ✓', color: 'var(--color-neon-cyan)' },
  MAS_XP: { label: '+ XP', color: 'var(--color-neon-green)' },
  DEFICIT: { label: 'DÉFICIT', color: 'var(--color-neon-red)' },
};

export function WeeksCard({ data }: WeeksCardProps) {
  return (
    <NeonCard
      tone="purple"
      title="SEMANAS"
      symbol=","
      cornerNote={
        <span className="flex items-baseline gap-3 font-[family-name:var(--font-vt323)]">
          <span className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-fg-subtle)' }}>
              COLCHÓN
            </span>
            <span className="text-2xl tabular-nums" style={{ color: 'var(--color-neon-cyan)' }}>
              +{data.colchonTotal}
            </span>
          </span>
          <span className="text-base" style={{ color: 'var(--color-fg-muted)' }}>
            {data.semanasOk}/{data.semanasTotales} OK
          </span>
        </span>
      }
    >
      <p
        className="text-base mb-2"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        Objetivo 7700 XP / semana · lun–dom · superávit → colchón · click semana
        DÉFICIT para invertir colchón
      </p>
      {data.semanas.length === 0 && (
        <p className="text-base text-center opacity-60" style={{ color: 'var(--color-fg-subtle)' }}>
          aún no hay semanas registradas
        </p>
      )}
      <div className="space-y-1">
        {data.semanas.map((s) => (
          <WeekRow key={s.id ?? s.inicio} week={s} colchonTotal={data.colchonTotal} />
        ))}
      </div>
    </NeonCard>
  );
}

function WeekRow({ week, colchonTotal }: { week: WeekStatus; colchonTotal: number }) {
  const tone = ESTADO_TONE[week.estado];
  const falta = Math.max(0, META_SEMANAL - week.xpTotal);
  const colchonAlcanza = colchonTotal >= falta;

  return (
    <div
      className="grid grid-cols-[6.5rem_1fr_3.5rem_5rem] items-center gap-2 border px-2 py-1.5 text-sm sm:grid-cols-[10rem_1fr_5rem_8rem] sm:gap-3 sm:text-base"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="font-[family-name:var(--font-vt323)] uppercase tracking-widest" style={{ color: tone.color }}>
        {formatRange(week.inicio, week.fin)}
      </div>
      <BarBicolor week={week} />
      <div
        className="text-right tabular-nums font-[family-name:var(--font-vt323)]"
        style={{ color: 'var(--color-fg)' }}
      >
        {week.xpTotal}
        <span style={{ color: 'var(--color-fg-subtle)' }}> / 7700</span>
      </div>
      <div className="text-right">
        {week.estado === 'DEFICIT' ? (
          <ApplyColchonAction
            week={week}
            colchonAlcanza={colchonAlcanza}
            falta={falta}
          />
        ) : week.estado === 'MAS_XP' ? (
          <span
            className="font-[family-name:var(--font-vt323)] uppercase tracking-widest"
            style={{ color: tone.color }}
          >
            + {week.excedente} XP
          </span>
        ) : (
          <span
            className="font-[family-name:var(--font-vt323)] uppercase tracking-widest"
            style={{ color: tone.color }}
          >
            {tone.label}
          </span>
        )}
      </div>
    </div>
  );
}

function BarBicolor({ week }: { week: WeekStatus }) {
  return (
    <div
      className="relative h-3 w-full border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* XP propio (naranja o verde si MAS_XP). */}
      <motion.div
        className="absolute inset-y-0 left-0"
        initial={{ width: 0 }}
        animate={{ width: `${week.pctPropio * 100}%` }}
        transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        style={{
          background: week.estado === 'MAS_XP' ? 'var(--color-neon-green)' : 'var(--color-neon-orange)',
          boxShadow: '0 0 4px -1px currentColor',
        }}
      />
      {/* XP del colchón (cian) tras el propio. */}
      {week.colchonInvertido > 0 && (
        <motion.div
          className="absolute inset-y-0"
          initial={{ width: 0 }}
          animate={{ width: `${week.pctColchon * 100}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.25 }}
          style={{
            left: `${week.pctPropio * 100}%`,
            background: 'var(--color-neon-cyan)',
            boxShadow: '0 0 4px -1px currentColor',
          }}
        />
      )}
      {week.colchonInvertido > 0 && (
        <span
          className="absolute -bottom-3 left-2 text-xs"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          +{week.colchonInvertido} del colchón
        </span>
      )}
    </div>
  );
}

function ApplyColchonAction({
  week,
  colchonAlcanza,
  falta,
}: {
  week: WeekStatus;
  colchonAlcanza: boolean;
  falta: number;
}) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => api.applyColchon(week.id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.weeks });
      void qc.invalidateQueries({ queryKey: queryKeys.xpSummary });
      setOpen(false);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    },
  });

  if (!week.id) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border px-2 py-0.5 text-xs uppercase tracking-widest hover:neon-glow-soft"
          style={{
            borderColor: 'var(--color-neon-red)',
            color: 'var(--color-neon-red)',
          }}
        >
          DÉFICIT
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>INVERTIR COLCHÓN</DialogTitle>
          <DialogDescription>
            Semana <strong>{formatRange(week.inicio, week.fin)}</strong> con{' '}
            {week.xpTotal} / 7700 XP. Faltan{' '}
            <strong>{falta}</strong> XP para compensar.
          </DialogDescription>
        </DialogHeader>
        {!colchonAlcanza && (
          <p
            className="text-base border px-3 py-2"
            style={{
              color: 'var(--color-neon-red)',
              borderColor: 'var(--color-neon-red)',
            }}
          >
            ✗ Colchón insuficiente para invertir esta semana.
          </p>
        )}
        {error && (
          <p
            className="text-base border px-3 py-2"
            style={{
              color: 'var(--color-neon-red)',
              borderColor: 'var(--color-neon-red)',
            }}
          >
            ✗ {error}
          </p>
        )}
        <div className="flex gap-3">
          <DialogClose asChild>
            <Button type="button" variant="ghost" tone="muted">
              cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="primary"
            tone="cyan"
            disabled={!colchonAlcanza}
            loading={mut.isPending}
            onClick={() => mut.mutate()}
          >
            Invertir {falta} XP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MESES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function formatRange(inicio: string, fin: string): string {
  // "4 MAY – 10 MAY" formato compacto.
  const a = parseIso(inicio);
  const b = parseIso(fin);
  return `${a.day} ${a.mes} – ${b.day} ${b.mes}`;
}

function parseIso(iso: string): { day: number; mes: string } {
  const [, m, d] = iso.split('-');
  const monthIdx = Number.parseInt(m ?? '1', 10) - 1;
  return {
    day: Number.parseInt(d ?? '1', 10),
    mes: MESES_ES[monthIdx] ?? '',
  };
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
