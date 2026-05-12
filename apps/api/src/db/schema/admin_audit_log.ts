import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Tipos de acción admin auditadas. Cualquier mutación realizada por
 * un usuario con role='admin' debe registrar una fila aquí.
 */
export const adminActionEnum = pgEnum('admin_action', [
  'suspend_user',
  'restore_user',
  'impersonate_user',
  'promote_user',
  'demote_user',
]);

/**
 * Audit trail de acciones administrativas. Inmutable (solo INSERT).
 *
 * - `adminUserId`: quién realizó la acción.
 * - `targetUserId`: sobre qué usuario (NULL si la acción no es sobre
 *   uno concreto, p.ej. cambios masivos).
 * - `payload`: detalles arbitrarios de la acción (motivo, estado
 *   anterior, etc.) en JSON.
 * - `ipHash`: SHA-256 de la IP del admin (minimización RGPD).
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: adminActionEnum('action').notNull(),
    payload: jsonb('payload'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_audit_admin_idx').on(t.adminUserId, t.createdAt),
    index('admin_audit_target_idx').on(t.targetUserId, t.createdAt),
    index('admin_audit_created_at_idx').on(t.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
