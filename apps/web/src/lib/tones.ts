/**
 * Mapeo central de tonos neón a variables CSS.
 * Mantenerlo aquí evita duplicar tablas en cada componente.
 */

export type NeonTone =
  | 'green'
  | 'orange'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'yellow'
  | 'magenta'
  | 'muted';

export const TONE_VAR: Record<NeonTone, string> = {
  green: 'var(--color-neon-green)',
  orange: 'var(--color-neon-orange)',
  cyan: 'var(--color-neon-cyan)',
  blue: 'var(--color-neon-blue)',
  purple: 'var(--color-neon-purple)',
  pink: 'var(--color-neon-pink)',
  red: 'var(--color-neon-red)',
  yellow: 'var(--color-neon-yellow)',
  magenta: 'var(--color-neon-magenta)',
  muted: 'var(--color-border-strong)',
};

export function toneVar(tone: string | null | undefined): string {
  if (tone && tone in TONE_VAR) {
    return TONE_VAR[tone as NeonTone];
  }
  return TONE_VAR.muted;
}
