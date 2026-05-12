'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MS_DIA = 24 * 60 * 60 * 1000;

function shiftDate(iso: string, days: number): string {
  const next = new Date(iso + 'T00:00:00Z').getTime() + days * MS_DIA;
  return new Date(next).toISOString().slice(0, 10);
}

interface DateNavProps {
  fecha: string;
  onChange: (newFecha: string) => void;
  /** Si true, no permite avanzar más allá de hoy. */
  cap?: boolean;
}

export function DateNav({ fecha, onChange, cap = true }: DateNavProps) {
  const hoy = new Date().toISOString().slice(0, 10);
  const isFuture = fecha >= hoy;

  return (
    <div
      className="flex items-center gap-2 font-[family-name:var(--font-vt323)] text-base"
    >
      <button
        type="button"
        aria-label="Día anterior"
        onClick={() => onChange(shiftDate(fecha, -1))}
        className="border px-2 py-1 hover:neon-glow-soft"
        style={{
          borderColor: 'var(--color-neon-green)',
          color: 'var(--color-neon-green)',
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        className="flex flex-col items-end leading-tight"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span className="text-xs uppercase tracking-widest">FECHA</span>
        <span style={{ color: 'var(--color-fg)' }}>{formatFecha(fecha)}</span>
      </div>
      <button
        type="button"
        aria-label="Día siguiente"
        disabled={cap && isFuture}
        onClick={() => onChange(shiftDate(fecha, 1))}
        className="border px-2 py-1 hover:neon-glow-soft disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          borderColor: 'var(--color-neon-green)',
          color: 'var(--color-neon-green)',
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatFecha(iso: string): string {
  // dd/MM/yyyy para coincidir con las capturas (ej. "06/05/2026").
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
