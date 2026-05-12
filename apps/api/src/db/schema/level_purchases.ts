import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Compra de nivel desde el colchón. Cada fila representa que el
 * usuario gastó `xpInvertida` (= xpPorNivel vigente al momento) para
 * adelantar 1 nivel en el camino L0→L80. Ver docs/DOMAIN.md §11.1.
 *
 * Constraint UNIQUE (user_id, nivel) garantiza que un nivel solo se
 * compre una vez. Si en el futuro se permite "deshacer" una compra,
 * sería un soft-delete con timestamp de revertido.
 */
export const levelPurchases = pgTable(
  'level_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nivel: integer('nivel').notNull(),
    xpInvertida: integer('xp_invertida').notNull(),
    compradaAt: timestamp('comprada_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('level_purchases_user_nivel_unique').on(t.userId, t.nivel),
    index('level_purchases_user_id_idx').on(t.userId),
  ],
);

export type LevelPurchase = typeof levelPurchases.$inferSelect;
export type NewLevelPurchase = typeof levelPurchases.$inferInsert;
