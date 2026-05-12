import { date, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Pesaje diario del usuario. Idempotente por (user_id, fecha): un
 * usuario solo puede tener un peso registrado por día.
 */
export const dailyWeight = pgTable(
  'daily_weight',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    pesoKg: numeric('peso_kg', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('daily_weight_user_fecha_unique').on(t.userId, t.fecha)],
);

export type DailyWeight = typeof dailyWeight.$inferSelect;
export type NewDailyWeight = typeof dailyWeight.$inferInsert;
