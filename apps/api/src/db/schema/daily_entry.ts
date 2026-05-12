import { date, integer, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Entrada diaria con todos los datos no-peso del día: pasos, calorías,
 * sodio, hidratación. Una fila por (user_id, fecha).
 */
export const dailyEntry = pgTable(
  'daily_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),

    /** Pasos brutos del día. La XP se calcula con tope 25k. */
    pasos: integer('pasos'),
    /** Marca "cerrar pasos" — el usuario considera el día cerrado. */
    pasosCerrados: timestamp('pasos_cerrados', { withTimezone: true }),

    /** Kcal ingeridas. NULL = no registrado (no se cuenta como déficit). */
    kcalIn: integer('kcal_in'),

    /** Sodio total del día en gramos. Usado para retención y meta hidratación. */
    sodioG: numeric('sodio_g', { precision: 5, scale: 2 }),

    /** Litros de cada tipo de bebida (snapshot del día). */
    aguaL: numeric('agua_l', { precision: 5, scale: 2 }).notNull().default('0'),
    cafeTeL: numeric('cafe_te_l', { precision: 5, scale: 2 }).notNull().default('0'),
    refrescoZeroL: numeric('refresco_zero_l', { precision: 5, scale: 2 }).notNull().default('0'),
    azucaradaL: numeric('azucarada_l', { precision: 5, scale: 2 }).notNull().default('0'),
    alcoholL: numeric('alcohol_l', { precision: 5, scale: 2 }).notNull().default('0'),

    /** Productividad declarada. */
    productividad: integer('productividad'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('daily_entry_user_fecha_unique').on(t.userId, t.fecha)],
);

export type DailyEntry = typeof dailyEntry.$inferSelect;
export type NewDailyEntry = typeof dailyEntry.$inferInsert;
