import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Tipos de consentimiento legal versionables. Cada vez que cambie el
 * texto de Términos / Privacidad / Cookies, se incrementa la `version`
 * y los usuarios deben volver a aceptar.
 */
export const consentTypeEnum = pgEnum('consent_type', ['terms', 'privacy', 'cookies']);

/**
 * Registro inmutable de aceptaciones de los textos legales. Cada fila
 * es un evento (usuario X aceptó terms v3 el día tal). Usado para
 * audit trail RGPD: si un usuario denuncia que no aceptó, podemos
 * demostrar que sí lo hizo o que no.
 *
 * No hay UNIQUE: un mismo usuario puede aceptar varias versiones a lo
 * largo del tiempo. Para saber el "último consent vigente" del
 * usuario, MAX(accepted_at) por (user_id, type).
 */
export const consentLog = pgTable(
  'consent_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: consentTypeEnum('type').notNull(),
    version: integer('version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
    /** Hash IP (no IP plana — minimización RGPD). */
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('consent_log_user_type_idx').on(t.userId, t.type),
    index('consent_log_accepted_at_idx').on(t.acceptedAt),
  ],
);

export type ConsentLog = typeof consentLog.$inferSelect;
export type NewConsentLog = typeof consentLog.$inferInsert;
