import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un controlador o handler como público (no requiere JWT).
 * Aplicado en /auth/register, /auth/login, /auth/refresh, /health.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
