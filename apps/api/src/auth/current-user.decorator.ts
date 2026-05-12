import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from './auth.types.js';

/**
 * Inyecta el usuario autenticado en el handler.
 *
 *   @CurrentUser()           → AuthenticatedRequestUser completo
 *   @CurrentUser('id')       → solo el userId
 *   @CurrentUser('sessionId')→ solo el sessionId
 *
 * Lanza error si el guard no ha poblado `req.user`. Solo úsalo en
 * rutas protegidas (por defecto: TODAS, excepto las marcadas @Public).
 */
export const CurrentUser = createParamDecorator(
  <K extends keyof AuthenticatedRequestUser | undefined = undefined>(
    field: K,
    ctx: ExecutionContext,
  ): K extends keyof AuthenticatedRequestUser ? AuthenticatedRequestUser[K] : AuthenticatedRequestUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) {
      throw new Error(
        '@CurrentUser usado fuera de una ruta protegida o el guard no se ha ejecutado',
      );
    }
    if (field === undefined) {
      return user as never;
    }
    return user[field as keyof AuthenticatedRequestUser] as never;
  },
);
