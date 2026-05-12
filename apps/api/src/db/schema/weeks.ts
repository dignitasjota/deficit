import { date, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const estadoSemanaEnum = pgEnum('estado_semana', [
  'EN_CURSO',
  'COMPENSADA',
  'MAS_XP',
  'DEFICIT',
]);

/**
 * Una fila por semana lun-dom. Persistida al cierre con su estado
 * final y el efecto sobre el colchón.
 */
export const weeks = pgTable(
  'weeks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inicio: date('inicio').notNull(),
    fin: date('fin').notNull(),
    xpTotal: integer('xp_total').notNull().default(0),
    estado: estadoSemanaEnum('estado').notNull().default('EN_CURSO'),
    colchonRecibido: integer('colchon_recibido').notNull().default(0),
    colchonInvertido: integer('colchon_invertido').notNull().default(0),
    cerradaAt: timestamp('cerrada_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('weeks_user_inicio_unique').on(t.userId, t.inicio)],
);

export type Week = typeof weeks.$inferSelect;
export type NewWeek = typeof weeks.$inferInsert;
