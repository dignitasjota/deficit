import { z } from 'zod';

/**
 * Catálogo de avatares válidos. Mantener en sincronía con
 * `apps/web/src/lib/avatars.ts` (`AVATAR_CATALOG`).
 *
 * Si añadís un avatar al catálogo: añadirlo aquí también para que la
 * API lo acepte.
 */
export const avatarIdSchema = z.enum([
  'warrior',
  'mage',
  'rogue',
  'cleric',
  'ranger',
  'monk',
]);

export type AvatarId = z.infer<typeof avatarIdSchema>;

export const updateAvatarInputSchema = z.object({
  avatarId: avatarIdSchema,
});
export type UpdateAvatarInput = z.infer<typeof updateAvatarInputSchema>;
