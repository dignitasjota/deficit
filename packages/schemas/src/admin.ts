import { z } from 'zod';

export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const adminActionSchema = z.enum([
  'suspend_user',
  'restore_user',
  'impersonate_user',
  'promote_user',
  'demote_user',
]);
export type AdminAction = z.infer<typeof adminActionSchema>;

/** Métricas globales del panel admin. */
export const adminMetricsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  verifiedUsers: z.number().int().nonnegative(),
  suspendedUsers: z.number().int().nonnegative(),
  pendingDeletionUsers: z.number().int().nonnegative(),
  newUsersLast7d: z.number().int().nonnegative(),
  newUsersLast30d: z.number().int().nonnegative(),
  activeLast7d: z.number().int().nonnegative(),
  activeLast30d: z.number().int().nonnegative(),
  /** MRR placeholder: 0 mientras no haya billing (Fase 17). */
  mrrCents: z.number().int().nonnegative(),
});
export type AdminMetrics = z.infer<typeof adminMetricsSchema>;

export const adminUserListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: userRoleSchema,
  emailVerifiedAt: z.string().datetime().nullable(),
  suspendedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
  purgeScheduledAt: z.string().datetime().nullable(),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const adminUserListPageSchema = z.object({
  users: z.array(adminUserListItemSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type AdminUserListPage = z.infer<typeof adminUserListPageSchema>;

export const adminUserListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** Búsqueda por email (LIKE %term%). */
  q: z.string().trim().optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUserDetailSchema = adminUserListItemSchema.extend({
  hasProfile: z.boolean(),
  pesoInicialKg: z.string().nullable(),
  pesoObjetivoKg: z.string().nullable(),
  totalSessions: z.number().int().nonnegative(),
  totalActiveSessions: z.number().int().nonnegative(),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

export const adminAuditEntrySchema = z.object({
  id: z.string().uuid(),
  adminUserId: z.string().uuid(),
  adminEmail: z.string().email().nullable(),
  targetUserId: z.string().uuid().nullable(),
  targetEmail: z.string().email().nullable(),
  action: adminActionSchema,
  payload: z.unknown(),
  createdAt: z.string().datetime(),
});
export type AdminAuditEntry = z.infer<typeof adminAuditEntrySchema>;

export const adminAuditPageSchema = z.object({
  entries: z.array(adminAuditEntrySchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type AdminAuditPage = z.infer<typeof adminAuditPageSchema>;

export const adminAuditQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;

/** Body de suspend/restore: motivo opcional. */
export const adminSuspendInputSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});
export type AdminSuspendInput = z.infer<typeof adminSuspendInputSchema>;

/**
 * Output de impersonate: par de tokens del usuario target + email
 * del admin original (para mostrar el banner "estás como X").
 */
export const impersonateOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  targetUserId: z.string().uuid(),
  targetEmail: z.string().email(),
});
export type ImpersonateOutput = z.infer<typeof impersonateOutputSchema>;
