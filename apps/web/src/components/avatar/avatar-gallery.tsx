'use client';

import Image from 'next/image';
import { AVATAR_CATALOG, type AvatarOption } from '@/lib/avatars';
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

export interface AvatarGalleryProps {
  value: string | null;
  onChange: (avatarId: string) => void;
}

/**
 * Grid 3×2 (responsive) de avatares seleccionables. El elegido luce con
 * borde y glow más intensos. Usa botones nativos para accesibilidad.
 */
export function AvatarGallery({ value, onChange }: AvatarGalleryProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Selecciona tu avatar"
    >
      {AVATAR_CATALOG.map((avatar) => {
        const selected = value === avatar.id;
        const color = TONE_VAR[avatar.tone];
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(avatar.id)}
            className={cn(
              'flex flex-col items-center gap-1 border-2 p-2 transition-all',
              'font-[family-name:var(--font-vt323)] text-base',
              'hover:opacity-100 focus:focus-neon focus:outline-none',
              selected ? 'opacity-100' : 'opacity-70 hover:opacity-100',
            )}
            style={{
              borderColor: color,
              color,
              boxShadow: selected ? `0 0 14px -3px ${color}` : undefined,
            }}
          >
            <Image
              src={`/avatars/${avatar.id}.svg`}
              alt={avatar.name}
              width={96}
              height={96}
              className="pixelated h-20 w-20"
            />
            <span className="uppercase tracking-wider neon-glow-soft">
              {avatar.name}
            </span>
            <span className="text-sm text-[color:var(--color-fg-subtle)]">
              {avatar.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
