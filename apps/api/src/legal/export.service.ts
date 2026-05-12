import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/index.js';
import { DATABASE, type Database } from '../db/database.module.js';

const {
  attributeLog,
  authSessions,
  consentLog,
  dailyEntry,
  dailyWeight,
  emailTokens,
  exerciseLog,
  levelPurchases,
  milestones,
  userProfile,
  users,
  weeks,
  xpLog,
} = schema;

/**
 * Export GDPR. Devuelve un objeto serializable a JSON con **todos** los
 * datos personales que el sistema almacena del usuario. El cliente lo
 * descarga como `perdida-peso-export-YYYY-MM-DD.json`.
 *
 * No incluimos `password_hash` ni `token_hash`s (datos derivados, no
 * proporcionados por el usuario; tampoco aportarían nada útil al
 * portarse). Sí incluimos `email_tokens` como timestamps + tipo (audit
 * trail), no el hash.
 */
@Injectable()
export class ExportService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async buildExport(userId: string): Promise<UserExport> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        avatarId: users.avatarId,
        emailVerifiedAt: users.emailVerifiedAt,
        deletedAt: users.deletedAt,
        purgeScheduledAt: users.purgeScheduledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [profileRows, weights, entries, exercises, attributes, xpLogs, weeksRows, milestonesRows, purchases, sessions, tokens, consents] =
      await Promise.all([
        this.db.select().from(userProfile).where(eq(userProfile.userId, userId)),
        this.db.select().from(dailyWeight).where(eq(dailyWeight.userId, userId)),
        this.db.select().from(dailyEntry).where(eq(dailyEntry.userId, userId)),
        this.db.select().from(exerciseLog).where(eq(exerciseLog.userId, userId)),
        this.db.select().from(attributeLog).where(eq(attributeLog.userId, userId)),
        this.db.select().from(xpLog).where(eq(xpLog.userId, userId)),
        this.db.select().from(weeks).where(eq(weeks.userId, userId)),
        this.db.select().from(milestones).where(eq(milestones.userId, userId)),
        this.db.select().from(levelPurchases).where(eq(levelPurchases.userId, userId)),
        this.db
          .select({
            id: authSessions.id,
            createdAt: authSessions.createdAt,
            expiresAt: authSessions.expiresAt,
            revokedAt: authSessions.revokedAt,
            lastSeenAt: authSessions.lastSeenAt,
            userAgent: authSessions.userAgent,
            ip: authSessions.ip,
          })
          .from(authSessions)
          .where(eq(authSessions.userId, userId)),
        this.db
          .select({
            type: emailTokens.type,
            expiresAt: emailTokens.expiresAt,
            usedAt: emailTokens.usedAt,
            createdAt: emailTokens.createdAt,
          })
          .from(emailTokens)
          .where(eq(emailTokens.userId, userId)),
        this.db
          .select({
            type: consentLog.type,
            version: consentLog.version,
            acceptedAt: consentLog.acceptedAt,
            userAgent: consentLog.userAgent,
          })
          .from(consentLog)
          .where(eq(consentLog.userId, userId)),
      ]);

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        avatarId: user.avatarId,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        deletedAt: user.deletedAt?.toISOString() ?? null,
        purgeScheduledAt: user.purgeScheduledAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      profile: profileRows,
      weights,
      entries,
      exercises,
      attributes,
      xpLog: xpLogs,
      weeks: weeksRows,
      milestones: milestonesRows,
      levelPurchases: purchases,
      sessions: sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() ?? null,
        lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
      })),
      emailTokens: tokens.map((t) => ({
        type: t.type,
        expiresAt: t.expiresAt.toISOString(),
        usedAt: t.usedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      consents: consents.map((c) => ({
        ...c,
        acceptedAt: c.acceptedAt.toISOString(),
      })),
    };
  }
}

export interface UserExport {
  version: 1;
  generatedAt: string;
  user: Record<string, unknown>;
  profile: unknown[];
  weights: unknown[];
  entries: unknown[];
  exercises: unknown[];
  attributes: unknown[];
  xpLog: unknown[];
  weeks: unknown[];
  milestones: unknown[];
  levelPurchases: unknown[];
  sessions: unknown[];
  emailTokens: unknown[];
  consents: unknown[];
}
