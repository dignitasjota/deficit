'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { AttributeStatus, AttributesSummary } from '@perdida-peso/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HelpCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonCard } from '@/components/ui/neon-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';
import { toneVar } from '@/lib/tones';

interface AttributesCardProps {
  data: AttributesSummary;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

const PRO_LEVELS: { value: 0 | 1 | 2 | 3; label: string; tone: string }[] = [
  { value: 0, label: 'TERRIBLE', tone: 'var(--color-neon-red)' },
  { value: 1, label: 'FLOJO', tone: 'var(--color-neon-orange)' },
  { value: 2, label: 'DECENTE', tone: 'var(--color-neon-cyan)' },
  { value: 3, label: 'BRUTAL', tone: 'var(--color-neon-green)' },
];

export function AttributesCard({ data }: AttributesCardProps) {
  const max = Math.max(15, ...data.atributos.map((a) => a.valor));
  // Reajusta el max a 15/20/25/30 (el más cercano hacia arriba).
  const ejeMax =
    max <= 15 ? 15 : max <= 20 ? 20 : max <= 25 ? 25 : Math.ceil(max / 5) * 5;

  return (
    <NeonCard
      tone="green"
      title="ATRIBUTOS"
      symbol=","
      cornerNote={
        <span className="flex flex-col items-end font-[family-name:var(--font-vt323)]">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-fg-subtle)' }}>
            TOTAL
          </span>
          <span className="text-2xl tabular-nums" style={{ color: 'var(--color-neon-green)' }}>
            {data.total}
          </span>
        </span>
      }
    >
      <p
        className="text-base mb-2"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        Actividades que cuestan · suma más de 1/día en distintas actividades
      </p>
      <div className="space-y-2">
        {data.atributos.map((attr) => (
          <AttributeRow key={attr.code} attr={attr} ejeMax={ejeMax} />
        ))}
      </div>
      <ProductividadFooter />
    </NeonCard>
  );
}

function AttributeRow({ attr, ejeMax }: { attr: AttributeStatus; ejeMax: number }) {
  const color = toneVar(attr.color);
  const pct = ejeMax > 0 ? Math.min(1, attr.valor / ejeMax) : 0;

  return (
    <div
      className="grid grid-cols-[3.5rem_1fr_auto_auto] items-center gap-2 border px-2 py-1"
      style={{ borderColor: color }}
    >
      <span
        className="text-base uppercase tracking-widest"
        style={{ color }}
      >
        × {attr.code}
      </span>
      <div
        className="relative h-4 border overflow-hidden"
        style={{ borderColor: color }}
      >
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{
            background: color,
            boxShadow: `0 0 6px -1px ${color}`,
          }}
        />
      </div>
      <span
        className="text-xl tabular-nums w-8 text-right"
        style={{ color }}
      >
        {attr.valor}
      </span>
      <ActionButton attr={attr} />
    </div>
  );
}

function ActionButton({ attr }: { attr: AttributeStatus }) {
  if (attr.modo === 'AUTO_HIDRATACION') {
    return (
      <span
        className="border px-2 py-1 text-xs uppercase tracking-widest"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-fg-subtle)',
        }}
      >
        AUTO
      </span>
    );
  }
  if (attr.modo === 'AUTO_PRODUCTIVIDAD') {
    return <ProductividadDialog current={attr.productividadHoy} />;
  }
  return <ManualIncrementDialog code={attr.code} disabled={attr.alcanzadoHoy} />;
}

function ManualIncrementDialog({
  code,
  disabled,
}: {
  code: AttributeStatus['code'];
  disabled: boolean;
}) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inc = useMutation({
    mutationFn: () =>
      api.incrementAttribute(code, {
        fecha: TODAY(),
        descripcion: descripcion.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attributes });
      setOpen(false);
      setDescripcion('');
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="border px-2 py-1 text-xs uppercase tracking-widest hover:neon-glow-soft disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--color-neon-orange)',
            color: 'var(--color-neon-orange)',
          }}
          aria-label={`Incrementar ${code}`}
        >
          {disabled ? '✓' : <Plus className="inline h-3 w-3" />}1
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>+1 · {code}</DialogTitle>
          <DialogDescription>
            ¿Qué actividad lo justifica hoy? (opcional, queda registrado en la
            bitácora)
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inc.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor={`desc-${code}`}>descripción</Label>
            <Input
              id={`desc-${code}`}
              autoFocus
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ludosport 40min, lectura, ..."
              maxLength={200}
            />
          </div>
          {error && (
            <p
              className="text-base border px-2 py-1"
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
            <Button type="submit" variant="primary" tone="orange" loading={inc.isPending}>
              Sumar +1
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductividadDialog({ current }: { current: number | null }) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const set = useMutation({
    mutationFn: (value: number) =>
      api.incrementAttribute('PRO', { fecha: TODAY(), value }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attributes });
      void qc.invalidateQueries({ queryKey: queryKeys.entry(TODAY()) });
      void qc.invalidateQueries({ queryKey: queryKeys.xpSummary });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border px-2 py-1 text-xs uppercase tracking-widest hover:neon-glow-soft"
          style={{
            borderColor: current !== null ? 'var(--color-neon-orange)' : 'var(--color-border)',
            color: current !== null ? 'var(--color-neon-orange)' : 'var(--color-fg-muted)',
          }}
          aria-label="Declarar productividad de hoy"
        >
          {current === null ? '?' : `+${current}`}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PRODUCTIVIDAD HOY</DialogTitle>
          <DialogDescription>
            Declara cómo de productivo ha sido tu día. Sustituye el valor
            anterior si ya habías marcado uno.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {PRO_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              disabled={set.isPending}
              onClick={() => set.mutate(lvl.value)}
              className="border-2 px-3 py-3 text-base uppercase tracking-widest hover:neon-glow-soft transition-all"
              style={{
                borderColor: lvl.tone,
                color: lvl.tone,
                background:
                  current === lvl.value
                    ? 'color-mix(in oklch, currentColor 12%, transparent)'
                    : undefined,
              }}
            >
              <span className="block text-xl tabular-nums mb-0.5">+{lvl.value}</span>
              {lvl.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductividadFooter() {
  return (
    <div
      className="mt-4 flex items-center justify-center gap-2 text-base"
      style={{ color: 'var(--color-neon-green)' }}
    >
      <HelpCircle className="h-4 w-4" />
      PRODUCTIVIDAD: TERRIBLE 0 · FLOJO +1 · DECENTE +2 · BRUTAL +3
    </div>
  );
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
