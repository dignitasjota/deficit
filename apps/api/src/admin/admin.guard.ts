import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DATABASE, type Database } from '../db/database.module.js';
import { users } from '../db/schema/users.js';
import { ADMIN_ONLY_KEY } from './admin-only.decorator.js';

/**
 * Guard adicional al global JwtAuthGuard. Solo activa si la ruta o
 * controlador está marcado con `@AdminOnly()`. Carga `users.role` y
 * exige `admin`.
 *
 * Pensado para registrarse a nivel de módulo (`AdminModule`) con
 * `APP_GUARD`-equivalente: se aplica antes que los handlers.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!adminOnly) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const [row] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException();
    }
    if (row.role !== 'admin') {
      throw new ForbiddenException('Acceso restringido a administradores.');
    }

    return true;
  }
}
