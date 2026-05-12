import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profileVersion } from './user_profile';
import { users } from './users';

/**
 * Códigos de tipo en la bitácora (ver §13.1 DOMAIN.md).
 * - P: Pasos
 * - C: Calorías (déficit)
 * - L: Ejercicio
 * - H: Hidratación
 * - A: Atributo (PRO con XP)
 * - M: Manual
 */
export const xpTipoEnum = pgEnum('xp_tipo', ['P', 'C', 'L', 'H', 'A', 'M']);

/**
 * Cada generación de XP escribe una fila aquí. Es la fuente de verdad
 * para la bitácora (§13.1) y el cálculo de `xpTotal` del usuario.
 *
 * Cada fila apunta a la versión del perfil con la que se generó →
 * cálculos históricos respetan el contexto.
 */
export const xpLog = pgTable(
  'xp_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileVersionId: uuid('profile_version_id')
      .notNull()
      .references(() => profileVersion.id, { onDelete: 'restrict' }),
    fecha: date('fecha').notNull(),
    tipo: xpTipoEnum('tipo').notNull(),
    descripcion: text('descripcion').notNull(),
    xp: integer('xp').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('xp_log_user_fecha_idx').on(t.userId, t.fecha),
    index('xp_log_user_created_idx').on(t.userId, t.createdAt),
  ],
);

export type XpLog = typeof xpLog.$inferSelect;
export type NewXpLog = typeof xpLog.$inferInsert;
