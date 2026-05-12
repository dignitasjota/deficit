import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { emailTokens } from '../db/schema/email_tokens.js';

export type EmailTokenType = 'verify' | 'reset';

const TTL_MS: Record<EmailTokenType, number> = {
  verify: 24 * 60 * 60 * 1000, // 24h
  reset: 60 * 60 * 1000, // 1h
};

const TOKEN_BYTES = 32; // 256 bits → ~43 chars en base64url

function hashToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

@Injectable()
export class EmailTokensService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Emite un nuevo token. **Invalida cualquier token activo del mismo
   * usuario y tipo** (set `used_at = now()`), de modo que solo haya
   * uno válido a la vez. Devuelve el token en plano (para mandar por
   * email) y `expiresAt`.
   */
  async issue(userId: string, type: EmailTokenType): Promise<{ token: string; expiresAt: Date }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_MS[type]);

    await this.db
      .update(emailTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailTokens.userId, userId),
          eq(emailTokens.type, type),
          isNull(emailTokens.usedAt),
        ),
      );

    const plain = randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenHash = hashToken(plain);

    await this.db.insert(emailTokens).values({
      userId,
      type,
      tokenHash,
      expiresAt,
    });

    return { token: plain, expiresAt };
  }

  /**
   * Consume un token: comprueba existencia, no-usado, no-expirado y
   * tipo coincidente. Si todo OK, lo marca `used_at = now()` y
   * devuelve el `userId` asociado. Si falla, devuelve null.
   *
   * El consumo es atómico: se hace UPDATE con WHERE en una sola
   * sentencia para evitar race conditions.
   */
  async consume(token: string, type: EmailTokenType): Promise<{ userId: string } | null> {
    const tokenHash = hashToken(token);
    const now = new Date();

    const updated = await this.db
      .update(emailTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailTokens.tokenHash, tokenHash),
          eq(emailTokens.type, type),
          isNull(emailTokens.usedAt),
          gte(emailTokens.expiresAt, now),
        ),
      )
      .returning({ userId: emailTokens.userId });

    const row = updated[0];
    return row ? { userId: row.userId } : null;
  }

  /**
   * Limpieza opcional: borra tokens caducados o ya usados con más de
   * 7 días de antigüedad. Pensado para el cron de mantenimiento.
   */
  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await this.db
      .delete(emailTokens)
      .where(lt(emailTokens.expiresAt, cutoff))
      .returning({ id: emailTokens.id });
    return deleted.length;
  }
}
