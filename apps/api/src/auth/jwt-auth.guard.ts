import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq, isNull } from 'drizzle-orm';
import type { Request } from 'express';
import { Inject } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { authSessions } from '../db/schema/auth_sessions.js';
import { JwtVerifyError, verifyJwt } from './crypto.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * Guard global. Valida el access token del header Authorization, mira
 * que la sesión sigue activa en BBDD, e inyecta `req.user`. Las rutas
 * marcadas con @Public se saltan la verificación.
 *
 * IMPORTANTE: hay un round-trip a BBDD por request para confirmar que
 * la sesión no ha sido revocada. Si esto se vuelve un cuello de botella
 * (Fase 18), añadir cache Redis con TTL corto y purga al revocar.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    // /metrics y /health son endpoints operacionales, públicos para
    // scraping de Prometheus y probes de Docker/K8s.
    if (req.path === '/metrics' || req.path.startsWith('/health')) {
      return true;
    }
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Falta el header Authorization Bearer');
    }

    let payload: ReturnType<typeof verifyJwt>;
    try {
      payload = verifyJwt(token, this.config.jwtSecret, 'access');
    } catch (e) {
      if (e instanceof JwtVerifyError) {
        throw new UnauthorizedException(`Access token inválido: ${e.code}`);
      }
      throw e;
    }

    const [session] = await this.db
      .select({ id: authSessions.id, userId: authSessions.userId })
      .from(authSessions)
      .where(and(eq(authSessions.id, payload.sid), isNull(authSessions.revokedAt)))
      .limit(1);

    if (!session) {
      throw new UnauthorizedException('Sesión revocada');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Sesión no coincide con el token');
    }

    req.user = { id: session.userId, sessionId: session.id };
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}
