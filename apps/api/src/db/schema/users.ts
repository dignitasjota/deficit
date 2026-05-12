import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

/** Plan de suscripción del usuario. `effectivePlan` puede ser premium si trial activo. */
export const userPlanEnum = pgEnum('user_plan', ['free', 'premium']);

/**
 * Skin / tema visual del usuario.
 *
 * Plumbing preparado para feature Premium futura. Hoy solo existe
 * `cyberpunk` (default). Para añadir una skin nueva:
 *   1. Añadir el id al enum aquí (ej. `'kawaii'`).
 *   2. Crear bloque `:root[data-theme="kawaii"]` en `globals.css` con
 *      las variables CSS sobreescritas.
 *   3. Migración Drizzle.
 *   4. (Opcional) feature gate en el endpoint si la skin es Premium.
 */
export const userThemeEnum = pgEnum('user_theme', ['cyberpunk']);

/**
 * Cuenta del sistema. La identidad principal del usuario.
 * Borrado lógico: `deleted_at IS NOT NULL` indica baja con período de
 * gracia; un cron purga definitivamente tras 30 días (Fase 14).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    /**
     * ID del avatar elegido por el usuario. Referencia a una entrada del
     * catálogo `apps/web/src/lib/avatars.ts`. NULL = usuario aún no ha
     * elegido avatar.
     */
    avatarId: text('avatar_id'),
    role: userRoleEnum('role').notNull().default('user'),
    plan: userPlanEnum('plan').notNull().default('free'),
    themePreference: userThemeEnum('theme_preference').notNull().default('cyberpunk'),
    /** ID del cliente en Stripe. NULL hasta que abre Checkout. */
    stripeCustomerId: text('stripe_customer_id'),
    /** Trial sin tarjeta concedido al registrarse. NULL si nunca tuvo trial. */
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** Suspendido por un admin: login bloqueado, datos preservados. */
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    /**
     * Fecha en la que el usuario será purgado físicamente. Set al
     * marcar `deleted_at` (típicamente +30 días). El cron de purga
     * compara contra `now()`.
     */
    purgeScheduledAt: timestamp('purge_scheduled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_deleted_at_idx').on(t.deletedAt),
    index('users_purge_scheduled_at_idx').on(t.purgeScheduledAt),
    index('users_role_idx').on(t.role),
    index('users_suspended_at_idx').on(t.suspendedAt),
    index('users_plan_idx').on(t.plan),
    index('users_stripe_customer_idx').on(t.stripeCustomerId),
    index('users_trial_ends_at_idx').on(t.trialEndsAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
