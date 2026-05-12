import { Inject, Injectable } from '@nestjs/common';
import type { DailyWeight, DailyWeightInput, DailyWeightListInput } from '@perdida-peso/schemas';
import { and, eq, gte, lte } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { dailyWeight } from '../db/schema/daily_weight.js';

@Injectable()
export class WeightsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(userId: string, filter: DailyWeightListInput): Promise<DailyWeight[]> {
    const conditions = [eq(dailyWeight.userId, userId)];
    if (filter.from) conditions.push(gte(dailyWeight.fecha, filter.from));
    if (filter.to) conditions.push(lte(dailyWeight.fecha, filter.to));

    const rows = await this.db
      .select()
      .from(dailyWeight)
      .where(and(...conditions))
      .orderBy(dailyWeight.fecha);

    return rows.map(this.toDto);
  }

  /**
   * Idempotente por (user_id, fecha): si ya hay peso para ese día, lo
   * actualiza; si no, lo crea.
   */
  async upsert(userId: string, input: DailyWeightInput): Promise<DailyWeight> {
    const [row] = await this.db
      .insert(dailyWeight)
      .values({
        userId,
        fecha: input.fecha,
        pesoKg: input.pesoKg.toString(),
      })
      .onConflictDoUpdate({
        target: [dailyWeight.userId, dailyWeight.fecha],
        set: {
          pesoKg: input.pesoKg.toString(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) throw new Error('Insert/update no devolvió fila');
    return this.toDto(row);
  }

  async deleteByDate(userId: string, fecha: string): Promise<void> {
    await this.db
      .delete(dailyWeight)
      .where(and(eq(dailyWeight.userId, userId), eq(dailyWeight.fecha, fecha)));
  }

  private toDto(row: typeof dailyWeight.$inferSelect): DailyWeight {
    return {
      id: row.id,
      fecha: row.fecha,
      pesoKg: Number(row.pesoKg),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
