import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Plan } from '@perdida-peso/schemas';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DATABASE, type Database } from '../db/database.module.js';
import { users } from '../db/schema/users.js';
import { REQUIRES_PLAN_KEY } from './requires-plan.decorator.js';

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  premium: 1,
};

/**
 * Guard que activa solo si la ruta o controller está marcado con
 * `@RequiresPlan(plan)`. Carga `users.plan` y `users.trial_ends_at`,
 * computa `effectivePlan` (premium si trial activo) y rechaza con
 * **402 Payment Required** si el plan efectivo no cubre el requerido.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Plan | undefined>(
      REQUIRES_PLAN_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const [row] = await this.db
      .select({ plan: users.plan, trialEndsAt: users.trialEndsAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new UnauthorizedException();

    const trialActive = row.trialEndsAt !== null && row.trialEndsAt > new Date();
    const effective: Plan = row.plan === 'premium' || trialActive ? 'premium' : 'free';

    if (PLAN_RANK[effective] < PLAN_RANK[required]) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Esta funcionalidad requiere plan ${required}.`,
          requiredPlan: required,
          currentPlan: effective,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
