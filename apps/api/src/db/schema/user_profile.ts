import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const sexoEnum = pgEnum('sexo', ['M', 'F']);

export const factorActividadEnum = pgEnum('factor_actividad', [
  'sedentario',
  'ligero',
  'moderado',
  'activo',
  'muy_activo',
]);

/**
 * Configuración vigente del usuario. Apunta a `profile_version` actual.
 * Solo una fila por usuario (UNIQUE en `user_id`).
 */
export const userProfile = pgTable(
  'user_profile',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentVersionId: uuid('current_version_id').notNull(),
    fechaInicio: date('fecha_inicio').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

/**
 * Versionado del perfil. Ver docs/DOMAIN.md §15.3 y ADR-009.
 *
 * Cada cambio en `pesoObjetivoKg`, `factorActividad` o `pesoInicialKg`
 * cierra la versión vigente (`valid_to = now()`) y abre una nueva. Los
 * logs de XP/atributos referencian el `profile_version_id` con el que
 * fueron generados → histórico inmutable.
 */
export const profileVersion = pgTable(
  'profile_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    pesoInicialKg: numeric('peso_inicial_kg', { precision: 5, scale: 2 }).notNull(),
    pesoObjetivoKg: numeric('peso_objetivo_kg', { precision: 5, scale: 2 }).notNull(),
    alturaCm: numeric('altura_cm', { precision: 5, scale: 1 }).notNull(),
    edad: integer('edad').notNull(),
    sexo: sexoEnum('sexo').notNull(),
    factorActividad: factorActividadEnum('factor_actividad').notNull(),
    /** Derivados cacheados (opcional, recalculables). */
    kgPorNivel: numeric('kg_por_nivel', { precision: 8, scale: 4 }).notNull(),
    xpPorNivel: numeric('xp_por_nivel', { precision: 10, scale: 2 }).notNull(),
    nivelesPorSemana: numeric('niveles_por_semana', { precision: 8, scale: 4 }).notNull(),
    motivoCambio: text('motivo_cambio'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('profile_version_user_id_idx').on(t.userId),
    index('profile_version_user_validity_idx').on(t.userId, t.validFrom, t.validTo),
  ],
);

export type UserProfileRow = typeof userProfile.$inferSelect;
export type NewUserProfileRow = typeof userProfile.$inferInsert;
export type ProfileVersion = typeof profileVersion.$inferSelect;
export type NewProfileVersion = typeof profileVersion.$inferInsert;
