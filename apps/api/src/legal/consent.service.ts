import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { ConsentRecord, ConsentType } from '@perdida-peso/schemas';
import { DATABASE, type Database } from '../db/database.module.js';
import { consentLog } from '../db/schema/consent_log.js';

@Injectable()
export class ConsentService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Registra una aceptación. La IP se hashea con SHA-256 (minimización
   * RGPD): podemos demostrar que un mismo dispositivo aceptó dos
   * veces, sin almacenar la IP en plano.
   */
  async accept(
    userId: string,
    type: ConsentType,
    version: number,
    ip?: string,
    userAgent?: string,
  ): Promise<ConsentRecord> {
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
    const [row] = await this.db
      .insert(consentLog)
      .values({
        userId,
        type,
        version,
        ipHash,
        userAgent: userAgent ?? null,
      })
      .returning({
        type: consentLog.type,
        version: consentLog.version,
        acceptedAt: consentLog.acceptedAt,
      });
    if (!row) throw new Error('No se pudo registrar el consent');
    return {
      type: row.type,
      version: row.version,
      acceptedAt: row.acceptedAt.toISOString(),
    };
  }

  async listForUser(userId: string): Promise<ConsentRecord[]> {
    const rows = await this.db
      .select({
        type: consentLog.type,
        version: consentLog.version,
        acceptedAt: consentLog.acceptedAt,
      })
      .from(consentLog)
      .where(eq(consentLog.userId, userId))
      .orderBy(desc(consentLog.acceptedAt));
    return rows.map((r) => ({
      type: r.type,
      version: r.version,
      acceptedAt: r.acceptedAt.toISOString(),
    }));
  }
}
