'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { DashboardHeader } from '@perdida-peso/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';

const FECHA_HOY = () => new Date().toISOString().slice(0, 10);

interface WeightCardProps {
  data: DashboardHeader;
}

export function WeightCard({ data }: WeightCardProps) {
  const { api } = useAuth();
  const qc = useQueryClient();
  const hoyIso = FECHA_HOY();
  const yaHayPesoHoy = data.pesoFecha === hoyIso;

  const [open, setOpen] = useState(false);
  const [pesoInput, setPesoInput] = useState(
    yaHayPesoHoy && data.pesoHoy !== null ? data.pesoHoy.toFixed(1) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: (pesoKg: number) => api.upsertWeight({ fecha: hoyIso, pesoKg }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboardHeader });
      void qc.invalidateQueries({ queryKey: ['weights'] });
      setOpen(false);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteWeight(hoyIso),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboardHeader });
      void qc.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number.parseFloat(pesoInput);
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 400) {
      setError('Peso fuera de rango (30–400 kg)');
      return;
    }
    upsert.mutate(parsed);
  }

  return (
    <NeonCard
      tone="green"
      title="PESO"
      symbol=","
      cornerNote={data.pesoFecha ? `Último: ${data.pesoFecha}` : undefined}
    >
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-base uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
            báscula
          </p>
          <p
            className="text-5xl neon-glow tabular-nums"
            style={{
              color: 'var(--color-neon-orange)',
              fontFamily: 'var(--font-vt323)',
            }}
          >
            {data.pesoHoy !== null ? data.pesoHoy.toFixed(1) : '—'}
            {data.pesoHoy !== null && (
              <span className="text-2xl ml-1">kg</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-base uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
            media 7d
          </p>
          <p
            className="text-5xl tabular-nums"
            style={{ color: 'var(--color-neon-cyan)' }}
          >
            {data.media7d !== null ? data.media7d.toFixed(1) : '—'}
            {data.media7d !== null && (
              <span className="text-2xl ml-1">kg</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-base uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
            teórico
          </p>
          <p
            className="text-5xl tabular-nums"
            style={{ color: 'var(--color-neon-green)' }}
          >
            {data.pesoTeorico.toFixed(1)}
            <span className="text-2xl ml-1">kg</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" tone="orange" className="w-full max-w-md">
              {yaHayPesoHoy ? '[ Editar peso de hoy ]' : '[ Actualizar peso de hoy ]'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>▸ ACTUALIZAR PESO · {hoyIso}</DialogTitle>
              <DialogDescription>
                Introduce el peso báscula del día (kg). Valor entre 30 y 400.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pesoKg">peso (kg)</Label>
                <Input
                  id="pesoKg"
                  type="number"
                  step="0.1"
                  min="30"
                  max="400"
                  required
                  autoFocus
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
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
                <Button
                  type="submit"
                  variant="primary"
                  tone="orange"
                  loading={upsert.isPending}
                >
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {yaHayPesoHoy && (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="text-base underline text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-neon-red)] disabled:opacity-40"
          >
            borrar peso de hoy
          </button>
        )}
      </div>
    </NeonCard>
  );
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'errors' in e.body) {
    const errors = (e.body as { errors: Record<string, string[]> }).errors;
    const first = Object.entries(errors)[0];
    if (first) return `${first[0]}: ${first[1][0]}`;
  }
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
