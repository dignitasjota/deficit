import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone =
  | 'green'
  | 'orange'
  | 'cyan'
  | 'purple'
  | 'red'
  | 'yellow'
  | 'pink'
  | 'magenta'
  | 'blue'
  | 'muted';

const TONE_VAR: Record<Tone, string> = {
  green: 'var(--color-neon-green)',
  orange: 'var(--color-neon-orange)',
  cyan: 'var(--color-neon-cyan)',
  purple: 'var(--color-neon-purple)',
  red: 'var(--color-neon-red)',
  yellow: 'var(--color-neon-yellow)',
  pink: 'var(--color-neon-pink)',
  magenta: 'var(--color-neon-magenta)',
  blue: 'var(--color-neon-blue)',
  muted: 'var(--color-border-strong)',
};

export interface NeonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Título tipo terminal: "✦ EXPERIENCIA" → símbolo + título upper. */
  title?: string;
  /** Texto pequeño en la esquina superior derecha (ej. "modelo retención"). */
  cornerNote?: React.ReactNode;
  /** Glow envolvente. Por defecto activado salvo que se pase false. */
  glow?: boolean;
  /** Símbolo a la izquierda del título. Por defecto "▸". */
  symbol?: string;
}

/**
 * Card cyberpunk con borde de color, header tipo terminal y opcional
 * nota en esquina derecha. Replica el estilo de las cards de las
 * capturas (PESO, RANGO ESPERADO, EXPERIENCIA, etc.).
 */
export function NeonCard({
  tone = 'green',
  title,
  cornerNote,
  glow = true,
  symbol = '▸',
  className,
  children,
  ...props
}: NeonCardProps) {
  const color = TONE_VAR[tone];
  return (
    <div
      className={cn(
        'border bg-[color:var(--color-bg)] p-4 font-[family-name:var(--font-vt323)]',
        className,
      )}
      style={{
        borderColor: color,
        boxShadow: glow ? `0 0 12px -4px ${color}` : undefined,
      }}
      {...props}
    >
      {(title || cornerNote) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && (
            <h2
              className="text-xl uppercase tracking-wider"
              style={{ color }}
            >
              <span className="mr-1.5">{symbol}</span>
              {title}
            </h2>
          )}
          {cornerNote && (
            <span
              className="text-base text-[color:var(--color-fg-subtle)]"
              aria-hidden="true"
            >
              {cornerNote}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/** Línea de stat tipo "RACHA  ………  54 d" alineada por flex. */
export function NeonStat({
  label,
  value,
  tone,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  valueClass?: string;
}) {
  const color = tone ? TONE_VAR[tone] : 'var(--color-fg)';
  return (
    <div className="flex items-baseline justify-between text-xl">
      <span className="uppercase tracking-wide text-[color:var(--color-fg-muted)]">
        {label}
      </span>
      <span
        className={cn('font-[family-name:var(--font-vt323)]', valueClass)}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

/** Slot vacío para fases futuras: card translúcida con leyenda. */
export function PlaceholderCard({
  title,
  comingIn,
  description,
}: {
  title: string;
  comingIn: string;
  description?: string;
}) {
  return (
    <div
      className="border border-dashed p-4 font-[family-name:var(--font-vt323)] opacity-60"
      style={{ borderColor: 'var(--color-border-strong)' }}
    >
      <h2 className="text-xl uppercase tracking-wider text-[color:var(--color-fg-muted)] mb-1">
        ▢ {title}
      </h2>
      <p className="text-base text-[color:var(--color-fg-subtle)]">
        Llega en <span style={{ color: 'var(--color-neon-cyan)' }}>{comingIn}</span>
        {description ? ` · ${description}` : ''}
      </p>
    </div>
  );
}
