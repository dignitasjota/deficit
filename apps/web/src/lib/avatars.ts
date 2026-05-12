/**
 * Catálogo de avatares pixel-art disponibles.
 *
 * Mantener en sincronía con `apps/web/public/avatars/*.svg` y con el
 * schema Zod de validación (`avatarIdSchema`). Para añadir uno nuevo:
 * 1. Soltar el SVG en `public/avatars/<id>.svg` (16×16 viewBox).
 * 2. Añadirlo aquí.
 * 3. Si se persiste, regenerar la enumeración Zod.
 */

export interface AvatarOption {
  id: string;
  name: string;
  description: string;
  /** Color neón temático sugerido para el frame (variable CSS). */
  tone:
    | 'green'
    | 'orange'
    | 'cyan'
    | 'purple'
    | 'red'
    | 'yellow'
    | 'pink'
    | 'magenta'
    | 'blue';
}

export const AVATAR_CATALOG: ReadonlyArray<AvatarOption> = [
  { id: 'warrior', name: 'Guerrero', description: 'fuerza, vitalidad', tone: 'red' },
  { id: 'mage', name: 'Mago', description: 'intelecto, espíritu', tone: 'purple' },
  { id: 'rogue', name: 'Pícaro', description: 'destreza, sigilo', tone: 'cyan' },
  { id: 'cleric', name: 'Clérigo', description: 'espíritu, hidratación', tone: 'yellow' },
  { id: 'ranger', name: 'Explorador', description: 'vitalidad, destreza', tone: 'green' },
  { id: 'monk', name: 'Monje', description: 'productividad, espíritu', tone: 'orange' },
];

export const DEFAULT_AVATAR_ID = 'warrior';

export function getAvatar(id: string | null | undefined): AvatarOption {
  return AVATAR_CATALOG.find((a) => a.id === id) ?? AVATAR_CATALOG[0]!;
}

export function isValidAvatarId(id: string): boolean {
  return AVATAR_CATALOG.some((a) => a.id === id);
}
