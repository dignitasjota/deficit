import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Hitos del usuario. Al crear cuenta se siembran los 9 hitos por
 * defecto (ver packages/domain `HITOS_POR_DEFECTO`). En premium el
 * usuario puede personalizarlos.
 */
export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nivel: integer('nivel').notNull(),
    nombre: text('nombre').notNull(),
    color: text('color'),
    alcanzadoAt: timestamp('alcanzado_at', { withTimezone: true }),
    archivado: boolean('archivado').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('milestones_user_nivel_unique').on(t.userId, t.nivel),
    index('milestones_user_alcanzado_idx').on(t.userId, t.alcanzadoAt),
  ],
);

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
