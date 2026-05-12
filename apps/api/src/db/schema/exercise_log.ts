import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const exerciseTipoEnum = pgEnum('exercise_tipo', ['ejercicio', 'caminata']);

/**
 * Sesión de ejercicio o caminata adicional del día.
 * Varios eventos por (user_id, fecha) son posibles.
 *
 * - `ejercicio`: la XP se calcula con `kcal × 0.7` (penalizacion).
 * - `caminata`: tracking informativo, los pasos van en daily_entry.
 */
export const exerciseLog = pgTable(
  'exercise_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    tipo: exerciseTipoEnum('tipo').notNull(),
    nombre: text('nombre').notNull(),
    minutos: integer('minutos'),
    kcalQuemadas: integer('kcal_quemadas'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('exercise_log_user_fecha_idx').on(t.userId, t.fecha)],
);

export type ExerciseLog = typeof exerciseLog.$inferSelect;
export type NewExerciseLog = typeof exerciseLog.$inferInsert;
