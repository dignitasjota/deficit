/**
 * Atributos inyectados en el request por JwtAuthGuard tras validar el
 * access token. Disponibles vía decorador @CurrentUser().
 */
export interface AuthenticatedRequestUser {
  id: string;
  sessionId: string;
}

/**
 * Augmentation global de `Express.Request`. Usamos la namespace
 * `Express` (no el subpath `express-serve-static-core`) porque
 * algunos setups de pnpm aíslan ese subpath y la augmentation se
 * rompe en build. La namespace `Express` está siempre disponible
 * con `@types/express`.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}

export {};
