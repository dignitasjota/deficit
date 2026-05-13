'use client';

import type { AttributesSummary } from '@perdida-peso/schemas';
import { useState } from 'react';
import { AttributesCard } from '@/components/dashboard/attributes-card';
import { DeporteCard } from '@/components/dashboard/deporte-card';
import { HidratacionCard } from '@/components/dashboard/hidratacion-card';
import { PremiumLockedCard } from '@/components/dashboard/premium-locked-card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DailyInputBarProps {
  pesoKg: number;
  attributes: AttributesSummary;
  isPremium: boolean;
}

type Slot = 'deporte' | 'hidratacion' | 'atributos';

const BUTTONS: Array<{
  slot: Slot;
  icon: string;
  label: string;
  color: string;
}> = [
  { slot: 'deporte', icon: '✦', label: 'Deporte', color: 'var(--color-neon-green)' },
  { slot: 'hidratacion', icon: '◇', label: 'Hidratación', color: 'var(--color-neon-cyan)' },
  { slot: 'atributos', icon: '◈', label: 'Atributos', color: 'var(--color-neon-pink)' },
];

/**
 * Barra fija de 3 botones de registro diario. Al hacer click se abre
 * un Dialog con la card correspondiente. La home queda limpia para
 * consultar datos; todo el input vive en modales.
 *
 * Default cerrado. Solo se abre uno a la vez. Cerrar con Esc, click
 * en backdrop o botón X del DialogContent.
 */
export function DailyInputBar({ pesoKg, attributes, isPremium }: DailyInputBarProps) {
  const [open, setOpen] = useState<Slot | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {BUTTONS.map((b) => (
          <button
            key={b.slot}
            type="button"
            onClick={() => setOpen(b.slot)}
            className={cn(
              'group flex flex-col items-center justify-center gap-1 border p-3 sm:p-4',
              'font-[family-name:var(--font-vt323)] uppercase tracking-widest',
              'transition-all hover:scale-[1.02] active:scale-[0.98]',
              'focus:outline-none focus-neon',
            )}
            style={{
              color: b.color,
              borderColor: b.color,
              background: `color-mix(in oklch, ${b.color} 8%, transparent)`,
              boxShadow: `0 0 10px -4px ${b.color}`,
            }}
            aria-label={`Registrar ${b.label}`}
          >
            <span
              className="text-2xl sm:text-3xl group-hover:neon-glow"
              aria-hidden="true"
            >
              {b.icon}
            </span>
            <span className="text-base sm:text-lg">{b.label}</span>
            <span
              className="text-xs sm:text-sm opacity-70"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              + Registrar
            </span>
          </button>
        ))}
      </div>

      <Dialog open={open === 'deporte'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Registrar deporte e hidratación</DialogTitle>
          <DeporteCard pesoKg={pesoKg} />
          <ModalCloseHint />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'hidratacion'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Registrar hidratación</DialogTitle>
          {isPremium ? (
            <HidratacionCard />
          ) : (
            <PremiumLockedCard
              title="HIDRATACIÓN HOY"
              description="Meta dinámica según tu sodio + multiplicadores por bebida (agua, café/té, zero)."
            />
          )}
          <ModalCloseHint />
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'atributos'} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Sumar atributos</DialogTitle>
          <AttributesCard data={attributes} />
          <ModalCloseHint />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModalCloseHint() {
  return (
    <DialogClose asChild>
      <button
        type="button"
        className="mt-3 w-full border px-3 py-2 font-[family-name:var(--font-vt323)] text-base uppercase tracking-widest focus-neon"
        style={{
          color: 'var(--color-fg-muted)',
          borderColor: 'var(--color-border-strong)',
        }}
      >
        [ Cerrar (Esc) ]
      </button>
    </DialogClose>
  );
}
