import { createHash } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type {
  AdminAction,
  AdminAuditEntry,
  AdminAuditPage,
  AdminAuditQuery,
  AdminMetrics,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserListPage,
  AdminUserListQuery,
  ImpersonateOutput,
} from '@perdida-peso/schemas';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { AppConfigService } from '../config/app-config.service.js';
import { signJwt } from '../auth/crypto.js';
import { authSessions } from '../db/schema/auth_sessions.js';
import { adminAuditLog } from '../db/schema/admin_audit_log.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { users } from '../db/schema/users.js';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { DATABASE, type Database } from '../db/database.module.js';

const MS_DAY = 24 * 60 * 60 * 1000;

const METRICS_CACHE_KEY = 'admin:metrics';
const METRICS_CACHE_TTL_MS = 30_000;

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly config: AppConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getMetrics(): Promise<AdminMetrics> {
    const cached = await this.cache.get<AdminMetrics>(METRICS_CACHE_KEY);
    if (cached) return cached;
    const fresh = await this.computeMetrics();
    await this.cache.set(METRICS_CACHE_KEY, fresh, METRICS_CACHE_TTL_MS);
    return fresh;
  }

  private async computeMetrics(): Promise<AdminMetrics> {
    const now = new Date();
    const days7 = new Date(now.getTime() - 7 * MS_DAY);
    const days30 = new Date(now.getTime() - 30 * MS_DAY);

    const [totalRow] = await this.db
      .select({ n: count() })
      .from(users);
    const [activeRow] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), isNull(users.suspendedAt)));
    const [verifiedRow] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(isNotNull(users.emailVerifiedAt), isNull(users.deletedAt)));
    const [suspendedRow] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(isNotNull(users.suspendedAt), isNull(users.deletedAt)));
    const [pendingDeletionRow] = await this.db
      .select({ n: count() })
      .from(users)
      .where(isNotNull(users.deletedAt));
    const [new7Row] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, days7)));
    const [new30Row] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, days30)));

    // Usuarios "activos" = con sesión vista en los últimos 7d/30d.
    const active7 = await this.db
      .selectDistinct({ userId: authSessions.userId })
      .from(authSessions)
      .where(gte(authSessions.lastSeenAt, days7));
    const active30 = await this.db
      .selectDistinct({ userId: authSessions.userId })
      .from(authSessions)
      .where(gte(authSessions.lastSeenAt, days30));

    return {
      totalUsers: totalRow?.n ?? 0,
      activeUsers: activeRow?.n ?? 0,
      verifiedUsers: verifiedRow?.n ?? 0,
      suspendedUsers: suspendedRow?.n ?? 0,
      pendingDeletionUsers: pendingDeletionRow?.n ?? 0,
      newUsersLast7d: new7Row?.n ?? 0,
      newUsersLast30d: new30Row?.n ?? 0,
      activeLast7d: active7.length,
      activeLast30d: active30.length,
      mrrCents: 0,
    };
  }

  async listUsers(query: AdminUserListQuery): Promise<AdminUserListPage> {
    const cursor = decodeCursor(query.cursor);
    const limit = query.limit;

    const conditions = [];
    if (query.q && query.q.length > 0) {
      conditions.push(ilike(users.email, `%${query.q}%`));
    }
    if (cursor) {
      conditions.push(
        sql`(${users.createdAt}, ${users.id}) < (${cursor.createdAt}, ${cursor.id})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        suspendedAt: users.suspendedAt,
        deletedAt: users.deletedAt,
        purgeScheduledAt: users.purgeScheduledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    // Last seen: una query agregada por user_id en una sola vuelta.
    const userIds = slice.map((r) => r.id);
    const lastSeenMap = new Map<string, Date>();
    if (userIds.length > 0) {
      const lastSeenRows = await this.db
        .select({
          userId: authSessions.userId,
          lastSeen: sql<Date>`MAX(${authSessions.lastSeenAt})`,
        })
        .from(authSessions)
        .where(or(...userIds.map((id) => eq(authSessions.userId, id))))
        .groupBy(authSessions.userId);
      for (const r of lastSeenRows) {
        if (r.lastSeen) lastSeenMap.set(r.userId, r.lastSeen);
      }
    }

    const totalConds = query.q ? [ilike(users.email, `%${query.q}%`)] : [];
    const [totalRow] = await this.db
      .select({ n: count() })
      .from(users)
      .where(totalConds.length > 0 ? and(...totalConds) : undefined);

    return {
      users: slice.map((r): AdminUserListItem => ({
        id: r.id,
        email: r.email,
        role: r.role,
        emailVerifiedAt: r.emailVerifiedAt?.toISOString() ?? null,
        suspendedAt: r.suspendedAt?.toISOString() ?? null,
        deletedAt: r.deletedAt?.toISOString() ?? null,
        purgeScheduledAt: r.purgeScheduledAt?.toISOString() ?? null,
        lastSeenAt: lastSeenMap.get(r.id)?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
      total: totalRow?.n ?? 0,
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        suspendedAt: users.suspendedAt,
        deletedAt: users.deletedAt,
        purgeScheduledAt: users.purgeScheduledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [profile] = await this.db
      .select({
        pesoInicialKg: profileVersion.pesoInicialKg,
        pesoObjetivoKg: profileVersion.pesoObjetivoKg,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);

    const [totalSessionsRow] = await this.db
      .select({ n: count() })
      .from(authSessions)
      .where(eq(authSessions.userId, userId));
    const [activeSessionsRow] = await this.db
      .select({ n: count() })
      .from(authSessions)
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));

    const [lastSeenRow] = await this.db
      .select({ lastSeen: sql<Date>`MAX(${authSessions.lastSeenAt})` })
      .from(authSessions)
      .where(eq(authSessions.userId, userId));

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      purgeScheduledAt: user.purgeScheduledAt?.toISOString() ?? null,
      lastSeenAt: lastSeenRow?.lastSeen?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      hasProfile: profile !== undefined,
      pesoInicialKg: profile?.pesoInicialKg ?? null,
      pesoObjetivoKg: profile?.pesoObjetivoKg ?? null,
      totalSessions: totalSessionsRow?.n ?? 0,
      totalActiveSessions: activeSessionsRow?.n ?? 0,
    };
  }

  async suspendUser(
    adminUserId: string,
    targetUserId: string,
    motivo: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<{ suspendedAt: string }> {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('No puedes suspender tu propia cuenta.');
    }
    const now = new Date();
    const updated = await this.db
      .update(users)
      .set({ suspendedAt: now, updatedAt: now })
      .where(and(eq(users.id, targetUserId), isNull(users.suspendedAt)))
      .returning({ id: users.id });
    if (updated.length === 0) {
      throw new NotFoundException(
        'Usuario no encontrado o ya estaba suspendido.',
      );
    }
    // Revocar todas sus sesiones activas para forzar logout inmediato.
    await this.db
      .update(authSessions)
      .set({ revokedAt: now })
      .where(
        and(eq(authSessions.userId, targetUserId), isNull(authSessions.revokedAt)),
      );
    await this.audit(adminUserId, targetUserId, 'suspend_user', { motivo: motivo ?? null }, ip, userAgent);
    return { suspendedAt: now.toISOString() };
  }

  async restoreUser(
    adminUserId: string,
    targetUserId: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    const now = new Date();
    const updated = await this.db
      .update(users)
      .set({ suspendedAt: null, updatedAt: now })
      .where(and(eq(users.id, targetUserId), isNotNull(users.suspendedAt)))
      .returning({ id: users.id });
    if (updated.length === 0) {
      throw new NotFoundException(
        'Usuario no encontrado o no estaba suspendido.',
      );
    }
    await this.audit(adminUserId, targetUserId, 'restore_user', null, ip, userAgent);
  }

  async impersonate(
    adminUserId: string,
    targetUserId: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<ImpersonateOutput> {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('No tiene sentido impersonar tu propia cuenta.');
    }
    const [target] = await this.db
      .select({
        id: users.id,
        email: users.email,
        deletedAt: users.deletedAt,
        suspendedAt: users.suspendedAt,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target || target.deletedAt) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (target.role === 'admin') {
      throw new ForbiddenException('No se puede impersonar a otro admin.');
    }

    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000);
    const [session] = await this.db
      .insert(authSessions)
      .values({
        userId: target.id,
        expiresAt,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      })
      .returning({ id: authSessions.id });
    if (!session) throw new Error('No se pudo crear la sesión impersonada.');

    const accessTtl = this.config.accessTokenTtlSeconds;
    const refreshTtl = this.config.refreshTokenTtlSeconds;
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = signJwt(
      { sub: target.id, sid: session.id, typ: 'access', exp: nowSec + accessTtl },
      this.config.jwtSecret,
    );
    const refreshToken = signJwt(
      { sub: target.id, sid: session.id, typ: 'refresh', exp: nowSec + refreshTtl },
      this.config.jwtSecret,
    );

    await this.audit(
      adminUserId,
      target.id,
      'impersonate_user',
      { sessionId: session.id },
      ip,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      targetUserId: target.id,
      targetEmail: target.email,
    };
  }

  async listAudit(query: AdminAuditQuery): Promise<AdminAuditPage> {
    const cursor = decodeCursor(query.cursor);
    const limit = query.limit;

    const conditions = [];
    if (cursor) {
      conditions.push(
        sql`(${adminAuditLog.createdAt}, ${adminAuditLog.id}) < (${cursor.createdAt}, ${cursor.id})`,
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const adminUser = users;
    const rows = await this.db
      .select({
        id: adminAuditLog.id,
        adminUserId: adminAuditLog.adminUserId,
        targetUserId: adminAuditLog.targetUserId,
        action: adminAuditLog.action,
        payload: adminAuditLog.payload,
        createdAt: adminAuditLog.createdAt,
        adminEmail: adminUser.email,
      })
      .from(adminAuditLog)
      .leftJoin(adminUser, eq(adminAuditLog.adminUserId, adminUser.id))
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt), desc(adminAuditLog.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    // Resolver targetEmail con un fetch separado por unique target ids.
    const targetIds = Array.from(
      new Set(slice.map((r) => r.targetUserId).filter((v): v is string => v !== null)),
    );
    const targetEmails = new Map<string, string>();
    if (targetIds.length > 0) {
      const tRows = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(or(...targetIds.map((id) => eq(users.id, id))));
      for (const t of tRows) targetEmails.set(t.id, t.email);
    }

    const [totalRow] = await this.db.select({ n: count() }).from(adminAuditLog);

    return {
      entries: slice.map((r): AdminAuditEntry => ({
        id: r.id,
        adminUserId: r.adminUserId,
        adminEmail: r.adminEmail ?? null,
        targetUserId: r.targetUserId,
        targetEmail: r.targetUserId ? targetEmails.get(r.targetUserId) ?? null : null,
        action: r.action,
        payload: r.payload,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
      total: totalRow?.n ?? 0,
    };
  }

  private async audit(
    adminUserId: string,
    targetUserId: string | null,
    action: AdminAction,
    payload: unknown,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
    await this.db.insert(adminAuditLog).values({
      adminUserId,
      targetUserId,
      action,
      payload: payload as Record<string, unknown> | null,
      ipHash,
      userAgent: userAgent ?? null,
    });
  }
}
