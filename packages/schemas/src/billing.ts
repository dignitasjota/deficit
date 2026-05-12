import { z } from 'zod';

export const planSchema = z.enum(['free', 'premium']);
export type Plan = z.infer<typeof planSchema>;

export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionPeriodSchema = z.enum(['month', 'year']);
export type SubscriptionPeriod = z.infer<typeof subscriptionPeriodSchema>;

/**
 * Estado de billing del usuario actual. `effectivePlan` aplica trial:
 * si `trialEndsAt > now()`, vale `premium` aunque `plan` sea `free`.
 */
export const billingStateSchema = z.object({
  plan: planSchema,
  effectivePlan: planSchema,
  trialEndsAt: z.string().datetime().nullable(),
  trialActive: z.boolean(),
  trialDaysLeft: z.number().int().nonnegative(),
  subscription: z
    .object({
      status: subscriptionStatusSchema,
      period: subscriptionPeriodSchema,
      currentPeriodEnd: z.string().datetime(),
      cancelAtPeriodEnd: z.boolean(),
      canceledAt: z.string().datetime().nullable(),
    })
    .nullable(),
});
export type BillingState = z.infer<typeof billingStateSchema>;

/** Body de POST /v1/billing/checkout. */
export const createCheckoutInputSchema = z.object({
  period: subscriptionPeriodSchema,
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

/** URL de redirección a Stripe Checkout o Customer Portal. */
export const billingUrlSchema = z.object({
  url: z.string().url(),
});
export type BillingUrl = z.infer<typeof billingUrlSchema>;
