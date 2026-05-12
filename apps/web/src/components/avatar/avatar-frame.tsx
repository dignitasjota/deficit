import Image from 'next/image';
import { type AvatarOption, getAvatar } from '@/lib/avatars';
import { cn } from '@/lib/utils';

const TONE_VAR: Record<AvatarOption['tone'], string> = {
  green: 'var(--color-neon-green)',
  orange: 'var(--color-neon-orange)',
  cyan: 'var(--color-neon-cyan)',
  purple: 'var(--color-neon-purple)',
  red: 'var(--color-neon-red)',
  yellow: 'var(--color-neon-yellow)',
  pink: 'var(--color-neon-pink)',
  magenta: 'var(--color-neon-magenta)',
  blue: 'var(--color-neon-blue)',
};

export interface AvatarFrameProps {
  avatarId: string | null | undefined;
  /** Texto superior izquierdo (ej. el nombre del usuario). */
  caption?: string;
  /** Texto superior derecho (ej. "NVL 0-80"). */
  captionRight?: string;
  /** Texto del footer izq (ej. "LUDOTEMPLO"). */
  footerLeft?: string;
  /** Texto del footer der (ej. "5/6"). */
  footerRight?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-32 w-32',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
} as const;

/**
 * Marco de avatar pixel-art con leyendas tipo HUD de videojuego retro.
 * Replica el frame del avatar de la imagen 1 (RUBEN LOAN · NVL 0-80).
 */
export function AvatarFrame({
  avatarId,
  caption,
  captionRight,
  footerLeft = 'LUDOTEMPLO',
  footerRight,
  size = 'md',
  className,
}: AvatarFrameProps) {
  const avatar = getAvatar(avatarId);
  const color = TONE_VAR[avatar.tone];

  return (
    <div
      className={cn(
        'flex flex-col font-[family-name:var(--font-vt323)]',
        className,
      )}
    >
      {(caption || captionRight) && (
        <div
          className="flex items-baseline justify-between border border-b-0 px-2 py-1 text-base uppercase tracking-wider"
          style={{ borderColor: color, color }}
        >
          <span>{caption ?? ' '}</span>
          {captionRight && (
            <span className="text-[color:var(--color-fg-muted)]">{captionRight}</span>
          )}
        </div>
      )}
      <div
        className={cn(
          'border bg-[color:var(--color-bg-elevated)] p-2 flex items-center justify-center',
          SIZES[size],
        )}
        style={{
          borderColor: color,
          boxShadow: `0 0 12px -3px ${color}, inset 0 0 24px -8px ${color}`,
        }}
      >
        <Image
          src={`/avatars/${avatar.id}.svg`}
          alt={avatar.name}
          width={192}
          height={192}
          className="pixelated h-full w-auto"
          priority
        />
      </div>
      {(footerLeft || footerRight) && (
        <div
          className="flex items-baseline justify-between border border-t-0 px-2 py-1 text-base uppercase tracking-wider"
          style={{ borderColor: color, color }}
        >
          <span>{footerLeft}</span>
          {footerRight && (
            <span className="text-[color:var(--color-fg-muted)]">{footerRight}</span>
          )}
        </div>
      )}
    </div>
  );
}
