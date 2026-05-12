import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Estado de la subscription según Stripe. Replicamos los valores
 * relevantes para nuestro feature gating.
 */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

/**
 * Período de facturación del plan contratado.
 */
export const subscriptionPeriodEnum = pgEnum('subscription_period', ['month', 'year']);

/**
 * Una subscription Stripe activa o histórica del usuario. Un usuario
 * puede tener varias filas a lo largo del tiempo (cancela y vuelve);
 * la "actual" es la que tiene `canceled_at IS NULL` y status no
 * terminal.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
    stripePriceId: text('stripe_price_id').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    period: subscriptionPeriodEnum('period').notNull(),
    /** Cuando termina el periodo actual (próxima facturación o expiración). */
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    /** True si el usuario solicitó cancelar pero sigue activa hasta fin de periodo. */
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('subscriptions_stripe_subscription_unique').on(t.stripeSubscriptionId),
    index('subscriptions_user_idx').on(t.userId),
    index('subscriptions_status_idx').on(t.status),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
