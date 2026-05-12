import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Audit + idempotencia de webhooks Stripe. UNIQUE en
 * `stripe_event_id` garantiza que el mismo evento no se procesa dos
 * veces (Stripe puede reintentar entregas).
 *
 * `payload` guarda el evento tal cual llega para debugging.
 */
export const billingEvents = pgTable(
  'billing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stripeEventId: text('stripe_event_id').notNull(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('billing_events_stripe_event_unique').on(t.stripeEventId),
    index('billing_events_type_idx').on(t.type),
    index('billing_events_processed_at_idx').on(t.processedAt),
  ],
);

export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
