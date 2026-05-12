import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AtributoCodigo,
  AttributeLogEntryDto,
  AttributeLogPage,
  AttributeLogQuery,
  AttributeStatus,
  AttributesSummary,
  IncrementAttributeInput,
} from '@perdida-peso/schemas';
import { and, desc, eq, sql } from 'drizzle-orm';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { attributeLog } from '../db/schema/attribute_log.js';
import { dailyEntry } from '../db/schema/daily_entry.js';
import { userProfile } from '../db/schema/user_profile.js';
import { EntriesService } from '../entries/entries.service.js';

interface AttributeMeta {
  code: AtributoCodigo;
  nombre: string;
  color: string;
  modo: AttributeStatus['modo'];
}

const ATTRIBUTE_CATALOG: ReadonlyArray<AttributeMeta> = [
  { code: 'FUE', nombre: 'Fuerza', color: 'red', modo: 'MANUAL' },
  { code: 'VIT', nombre: 'Vitalidad', color: 'green', modo: 'MANUAL' },
  { code: 'DES', nombre: 'Destreza', color: 'yellow', modo: 'MANUAL' },
  { code: 'INT', nombre: 'Intelecto', color: 'blue', modo: 'MANUAL' },
  { code: 'CRE', nombre: 'Creatividad', color: 'cyan', modo: 'MANUAL' },
  { code: 'ESP', nombre: 'Espíritu', color: 'purple', modo: 'MANUAL' },
  { code: 'CAR', nombre: 'Carisma', color: 'pink', modo: 'MANUAL' },
  { code: 'HID', nombre: 'Hidratación', color: 'magenta', modo: 'AUTO_HIDRATACION' },
  { code: 'PRO', nombre: 'Productividad', color: 'orange', modo: 'AUTO_PRODUCTIVIDAD' },
];

@Injectable()
export class AttributesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly entries: EntriesService,
  ) {}

  async getAll(userId: string): Promise<AttributesSummary> {
    await this.assertUserHasProfile(userId);

    const hoyIso = new Date().toISOString().slice(0, 10);

    // SUM(delta) por atributo en una sola query.
    const sumas = await this.db
      .select({
        atributo: attributeLog.atributo,
        valor: sql<number>`COALESCE(SUM(${attributeLog.delta}), 0)::int`,
      })
      .from(attributeLog)
      .where(eq(attributeLog.userId, userId))
      .groupBy(attributeLog.atributo);
    const mapValor = new Map<AtributoCodigo, number>(
      sumas.map((row) => [row.atributo, row.valor]),
    );

    // ¿Qué atributos se han incrementado hoy?
    const hoy = await this.db
      .select({
        atributo: attributeLog.atributo,
        delta: sql<number>`COALESCE(SUM(${attributeLog.delta}), 0)::int`,
      })
      .from(attributeLog)
      .where(and(eq(attributeLog.userId, userId), eq(attributeLog.fecha, hoyIso)))
      .groupBy(attributeLog.atributo);
    const mapHoy = new Map<AtributoCodigo, number>(hoy.map((r) => [r.atributo, r.delta]));

    // Productividad declarada hoy (de daily_entry).
    const [entryHoy] = await this.db
      .select({ productividad: dailyEntry.productividad })
      .from(dailyEntry)
      .where(and(eq(dailyEntry.userId, userId), eq(dailyEntry.fecha, hoyIso)))
      .limit(1);
    const productividadHoy = entryHoy?.productividad ?? null;

    let total = 0;
    const atributos: AttributeStatus[] = ATTRIBUTE_CATALOG.map((meta) => {
      const valor = mapValor.get(meta.code) ?? 0;
      total += valor;
      return {
        code: meta.code,
        nombre: meta.nombre,
        color: meta.color,
        valor,
        modo: meta.modo,
        alcanzadoHoy: (mapHoy.get(meta.code) ?? 0) > 0,
        productividadHoy: meta.code === 'PRO' ? productividadHoy : null,
      };
    });

    return { atributos, total };
  }

  async increment(
    userId: string,
    code: AtributoCodigo,
    input: IncrementAttributeInput,
  ): Promise<{ valor: number; alcanzadoHoy: boolean }> {
    if (code === 'HID') {
      throw new BadRequestException(
        'HID es automático. Cumple la meta de hidratación desde la card de HIDRATACIÓN HOY.',
      );
    }

    if (code === 'PRO') {
      if (input.value === undefined) {
        throw new BadRequestException(
          'PRO requiere `value` (0=terrible, 1=flojo, 2=decente, 3=brutal).',
        );
      }
      // Delegar al EntriesService que ya gestiona el sync attribute_log PRO.
      await this.entries.upsert(userId, input.fecha, { productividad: input.value });
    } else {
      // Manual: +1 si no hay registro del día.
      const [existing] = await this.db
        .select({ id: attributeLog.id })
        .from(attributeLog)
        .where(
          and(
            eq(attributeLog.userId, userId),
            eq(attributeLog.fecha, input.fecha),
            eq(attributeLog.atributo, code),
          ),
        )
        .limit(1);

      if (existing) {
        throw new BadRequestException(`Ya has registrado un +1 de ${code} hoy.`);
      }

      await this.db.insert(attributeLog).values({
        userId,
        fecha: input.fecha,
        atributo: code,
        delta: 1,
        descripcion: input.descripcion ?? null,
      });
    }

    // Devolver valor actualizado.
    const [{ valor = 0 } = {}] = await this.db
      .select({ valor: sql<number>`COALESCE(SUM(${attributeLog.delta}), 0)::int` })
      .from(attributeLog)
      .where(and(eq(attributeLog.userId, userId), eq(attributeLog.atributo, code)));

    return { valor, alcanzadoHoy: true };
  }

  async getLog(userId: string, query: AttributeLogQuery): Promise<AttributeLogPage> {
    const cursor = decodeCursor(query.cursor);
    const limit = query.limit;
    const filter = query.atributo ?? null;

    const conditions = [eq(attributeLog.userId, userId)];
    if (filter) conditions.push(eq(attributeLog.atributo, filter));
    if (cursor) {
      conditions.push(
        sql`(${attributeLog.createdAt}, ${attributeLog.id}) < (${cursor.createdAt}, ${cursor.id})`,
      );
    }

    const rows = await this.db
      .select({
        id: attributeLog.id,
        fecha: attributeLog.fecha,
        atributo: attributeLog.atributo,
        delta: attributeLog.delta,
        descripcion: attributeLog.descripcion,
        createdAt: attributeLog.createdAt,
      })
      .from(attributeLog)
      .where(and(...conditions))
      .orderBy(desc(attributeLog.createdAt), desc(attributeLog.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    const entries: AttributeLogEntryDto[] = slice.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      atributo: r.atributo,
      delta: r.delta,
      descripcion: r.descripcion,
      createdAt: r.createdAt.toISOString(),
    }));

    const totalConditions = [eq(attributeLog.userId, userId)];
    if (filter) totalConditions.push(eq(attributeLog.atributo, filter));
    const [{ total = 0 } = {}] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(attributeLog)
      .where(and(...totalConditions));

    return { entries, nextCursor, total, filter };
  }

  private async assertUserHasProfile(userId: string): Promise<void> {
    const [row] = await this.db
      .select({ userId: userProfile.userId })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }
  }
}
