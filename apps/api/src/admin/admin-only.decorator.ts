import { SetMetadata } from '@nestjs/common';

export const ADMIN_ONLY_KEY = 'admin_only';

/**
 * Marca una ruta o controlador como accesible solo por admins.
 * Combinado con `AdminGuard`, hace round-trip a BBDD para
 * comprobar `users.role`.
 */
export const AdminOnly = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ADMIN_ONLY_KEY, true);
