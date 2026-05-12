import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Tipo de token de email. `verify` para verificación inicial, `reset`
 * para password reset.
 */
export const emailTokenTypeEnum = pgEnum('email_token_type', ['verify', 'reset']);

/**
 * Tokens enviados por email para acciones sensibles. Guardamos el
 * hash SHA-256 del token (nunca el token en plano), igual que los
 * password hashes.
 *
 * - **verify**: TTL 24h. Marca `users.email_verified_at` al consumir.
 * - **reset**: TTL 1h. Cambia password al consumir.
 *
 * Tokens activos por usuario: invalidamos los anteriores del mismo
 * tipo al emitir uno nuevo (set `used_at = now()`), evita acumulación
 * y race conditions.
 */
export const emailTokens = pgTable(
  'email_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: emailTokenTypeEnum('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('email_tokens_token_hash_unique').on(t.tokenHash),
    index('email_tokens_user_type_idx').on(t.userId, t.type),
    index('email_tokens_expires_at_idx').on(t.expiresAt),
  ],
);

export type EmailToken = typeof emailTokens.$inferSelect;
export type NewEmailToken = typeof emailTokens.$inferInsert;
