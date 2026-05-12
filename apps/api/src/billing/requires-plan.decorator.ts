import { SetMetadata } from '@nestjs/common';
import type { Plan } from '@perdida-peso/schemas';

export const REQUIRES_PLAN_KEY = 'requires_plan';

/**
 * Marca una ruta o controlador como requeridor de un plan mínimo.
 * Combinado con `PlanGuard`, hace round-trip a BBDD para comprobar
 * `users.plan` y `users.trial_ends_at` (effectivePlan).
 *
 * Uso: `@RequiresPlan('premium')` antes del handler.
 */
export const RequiresPlan = (plan: Plan): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRES_PLAN_KEY, plan);
