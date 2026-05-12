import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const atributoEnum = pgEnum('atributo_codigo', [
  'FUE',
  'VIT',
  'DES',
  'INT',
  'CRE',
  'ESP',
  'CAR',
  'HID',
  'PRO',
]);

/**
 * Cada incremento de un atributo. Una fila por +N.
 * - HID se escribe automáticamente cuando cumple meta hidratación.
 * - PRO se escribe diariamente desde la productividad (+0/+1/+2/+3).
 * - Resto: input manual desde la UI.
 */
export const attributeLog = pgTable(
  'attribute_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    atributo: atributoEnum('atributo').notNull(),
    delta: integer('delta').notNull().default(1),
    descripcion: text('descripcion'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('attribute_log_user_fecha_idx').on(t.userId, t.fecha),
    index('attribute_log_user_atributo_idx').on(t.userId, t.atributo),
  ],
);

export type AttributeLog = typeof attributeLog.$inferSelect;
export type NewAttributeLog = typeof attributeLog.$inferInsert;
