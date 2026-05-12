'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { PathDestination, ReachedLevel, UpcomingLevel } from '@perdida-peso/schemas';
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

interface PathCardProps {
  data: PathDestination;
}

export function PathCard({ data }: PathCardProps) {
  return (
    <NeonCard
      tone="purple"
      title="CAMINO AL DESTINO"
      symbol=","
      cornerNote={
        <span className="flex flex-col items-end font-[family-name:var(--font-vt323)]">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            LLEGADA EST.
          </span>
          <span
            className="text-2xl tabular-nums"
            style={{ color: 'var(--color-neon-purple)' }}
          >
            {formatFecha(data.llegadaEstimada)}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            {data.semanasRestantes} sem. restantes
          </span>
        </span>
      }
    >
      {/* 4 KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
        <Kpi label="NIVEL ACTUAL" value={`L${data.nivelActual}`} tone="purple" />
        <Kpi label="DESTINO" value={`L${data.destino}`} tone="purple" />
        <Kpi
          label="NIVELES RESTANTES"
          value={`${data.nivelesRestantes}`}
          tone="cyan"
        />
        <Kpi
          label="COMPRADAS"
          value={`${data.nivelesComprados}`}
          tone={data.nivelesComprados > 0 ? 'orange' : 'muted'}
        />
      </div>

      {/* Barra grande L0→L80 con marker AQUÍ */}
      <BigPathBar data={data} />

      {/* Listas POR VENIR / CONSEGUIDOS */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListColumn title="POR VENIR" tone="purple">
          <UpcomingList items={data.porVenir} />
        </ListColumn>
        <ListColumn title="CONSEGUIDOS" tone="cyan">
          <ReachedList items={data.conseguidos} />
        </ListColumn>
      </div>

      {/* Footer con botón comprar */}
      <Footer data={data} />
    </NeonCard>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'purple' | 'cyan' | 'orange' | 'muted';
}) {
  const colorMap = {
    purple: 'var(--color-neon-purple)',
    cyan: 'var(--color-neon-cyan)',
    orange: 'var(--color-neon-orange)',
    muted: 'var(--color-fg-muted)',
  } as const;
  return (
    <div
      className="border px-2 py-1.5 font-[family-name:var(--font-vt323)]"
      style={{ borderColor: colorMap[tone] }}
    >
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl tabular-nums neon-glow-soft"
        style={{ color: colorMap[tone] }}
      >
        {value}
      </p>
    </div>
  );
}

function BigPathBar({ data }: { data: PathDestination }) {
  const pct = data.pctCamino * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs uppercase tracking-widest"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        <span>L0</span>
        <span style={{ color: 'var(--color-neon-purple)' }}>
          ↓ AQUÍ · L{data.nivelActual}
        </span>
        <span>L80</span>
      </div>
      <div
        className="relative h-5 w-full border overflow-hidden"
        style={{ borderColor: 'var(--color-neon-purple)' }}
      >
        <motion.div
          className="h-full neon-shimmer"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          style={{
            color: 'var(--color-neon-purple)',
            boxShadow: '0 0 10px -2px var(--color-neon-purple)',
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-base tabular-nums neon-glow-soft"
          style={{
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-vt323)',
          }}
        >
          {pct.toFixed(1)}% del camino
        </span>
      </div>
    </div>
  );
}

function ListColumn({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'purple' | 'cyan';
  children: React.ReactNode;
}) {
  const colorMap = {
    purple: 'var(--color-neon-purple)',
    cyan: 'var(--color-neon-cyan)',
  } as const;
  return (
    <div>
      <h3
        className="text-xl uppercase tracking-wider mb-1"
        style={{ color: colorMap[tone] }}
      >
        , {title}
      </h3>
      <div
        className="border p-1 max-h-72 overflow-y-auto font-[family-name:var(--font-vt323)] text-base"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {children}
      </div>
    </div>
  );
}

function UpcomingList({ items }: { items: UpcomingLevel[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center opacity-60 py-2" style={{ color: 'var(--color-fg-subtle)' }}>
        ya estás en el destino
      </p>
    );
  }
  return (
    <ul className="space-y-0.5">
      {items.map((u) => (
        <li
          key={u.nivel}
          className="grid grid-cols-[3rem_1fr] items-baseline px-1.5 py-0.5"
        >
          <span style={{ color: 'var(--color-neon-purple)' }}>L{u.nivel}</span>
          <span className="text-right tabular-nums" style={{ color: 'var(--color-fg)' }}>
            {formatFecha(u.fechaEstimada)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ReachedList({ items }: { items: ReachedLevel[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center opacity-60 py-2" style={{ color: 'var(--color-fg-subtle)' }}>
        sin niveles conseguidos aún
      </p>
    );
  }
  return (
    <ul className="space-y-0.5">
      {items.map((r) => {
        const tagColor =
          r.origin === 'COMPRADA' ? 'var(--color-neon-orange)' : 'var(--color-neon-green)';
        return (
          <li
            key={r.nivel}
            className="grid grid-cols-[3rem_1fr_5.5rem] items-baseline px-1.5 py-0.5"
          >
            <span style={{ color: 'var(--color-neon-cyan)' }}>L{r.nivel}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-fg)' }}>
              {formatFecha(r.fecha)}
            </span>
            <span
              className="text-right text-xs uppercase tracking-widest"
              style={{ color: tagColor }}
            >
              {r.origin}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ data }: { data: PathDestination }) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = useMutation({
    mutationFn: () => api.buyLevel(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pathDestination });
      void qc.invalidateQueries({ queryKey: queryKeys.weeks });
      void qc.invalidateQueries({ queryKey: queryKeys.xpSummary });
      setOpen(false);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    },
  });

  return (
    <div
      className="mt-4 flex flex-col items-center gap-1 font-[family-name:var(--font-vt323)] text-base"
      style={{ color: 'var(--color-fg-muted)' }}
    >
      <p>
        FUNDIR{' '}
        <span style={{ color: 'var(--color-neon-orange)' }}>
          {data.costePorCompra} XP
        </span>{' '}
        DEL COLCHÓN PARA ADELANTAR 1 SEMANA EL PRONÓSTICO.
      </p>
      <p>
        COLCHÓN DISPONIBLE:{' '}
        <span style={{ color: 'var(--color-neon-cyan)' }}>{data.colchonDisponible} XP</span>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="primary"
            tone="orange"
            disabled={!data.puedeComprar}
            className="mt-2 max-w-md w-full"
          >
            ▸ COMPRAR 1 SEMANA
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>COMPRAR 1 NIVEL</DialogTitle>
            <DialogDescription>
              Vas a fundir <strong>{data.costePorCompra} XP</strong> del colchón
              para adelantar 1 nivel. Tu nivel actual subirá a{' '}
              <strong>L{data.nivelActual + 1}</strong> y la fecha estimada de
              llegada se acercará en 1 semana.
            </DialogDescription>
          </DialogHeader>
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
              tone="orange"
              loading={buy.isPending}
              onClick={() => buy.mutate()}
            >
              Confirmar compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {!data.puedeComprar && (
        <p className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
          {data.nivelActual >= 80
            ? 'jefe final superado · no se pueden comprar más niveles'
            : 'colchón insuficiente para comprar un nivel'}
        </p>
      )}
    </div>
  );
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
