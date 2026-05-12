import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WeeksSummary, WeekStatus } from '@perdida-peso/schemas';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { levelPurchases } from '../db/schema/level_purchases.js';
import { userProfile } from '../db/schema/user_profile.js';
import { weeks } from '../db/schema/weeks.js';
import { xpLog } from '../db/schema/xp_log.js';

const MS_DIA = 24 * 60 * 60 * 1000;
const META_SEMANAL = 7700;

@Injectable()
export class WeeksService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getAll(userId: string): Promise<WeeksSummary> {
    // 1. Perfil para fechaInicio.
    const [perfil] = await this.db
      .select({ fechaInicio: userProfile.fechaInicio })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    if (!perfil) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }

    const today = new Date();
    const todayIso = isoDate(today);
    const lunesPrimera = startOfWeek(perfil.fechaInicio);
    const lunesActual = startOfWeek(todayIso);

    // 2. Materializar semanas terminadas que aún no estén en weeks.
    await this.materializeClosedWeeks(userId, lunesPrimera, lunesActual);

    // 3. Cargar todas las filas weeks del usuario.
    const rows = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.userId, userId))
      .orderBy(weeks.inicio);

    const idx = new Map(rows.map((r) => [r.inicio, r]));

    // 4. Construir lista cronológica desde lunesPrimera hasta lunesActual
    //    (incluida la semana en curso, que se calcula al vuelo).
    const semanas: WeekStatus[] = [];
    for (
      let cursorMs = isoMs(lunesPrimera);
      cursorMs <= isoMs(lunesActual);
      cursorMs += 7 * MS_DIA
    ) {
      const inicio = isoDate(new Date(cursorMs));
      const fin = isoDate(new Date(cursorMs + 6 * MS_DIA));
      const stored = idx.get(inicio);

      if (stored) {
        semanas.push(this.toStatus(stored, false));
      } else if (inicio === lunesActual) {
        // Semana en curso: calcular xpTotal al vuelo.
        const xpTotal = await this.sumXpRange(userId, inicio, todayIso);
        semanas.push({
          id: null,
          inicio,
          fin,
          xpTotal,
          estado: 'EN_CURSO',
          colchonRecibido: 0,
          colchonInvertido: 0,
          cerradaAt: null,
          pctPropio: clamp01(xpTotal / META_SEMANAL),
          pctColchon: 0,
          excedente: Math.max(0, xpTotal - META_SEMANAL),
          puedeInvertirColchon: false,
        });
      }
      // Si no está stored y NO es la semana actual, materializeClosedWeeks
      // ya la habrá insertado. No debería pasar.
    }

    const colchonTotal = await this.computeColchonTotal(userId);
    const cerradas = semanas.filter((s) => s.estado !== 'EN_CURSO');
    const semanasOk = cerradas.filter(
      (s) => s.estado === 'MAS_XP' || s.estado === 'COMPENSADA',
    ).length;

    // Devolver DESC (más reciente primero).
    semanas.reverse();

    return {
      semanas,
      colchonTotal,
      semanasOk,
      semanasTotales: cerradas.length,
    };
  }

  async applyColchon(userId: string, weekId: string): Promise<WeekStatus> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(weeks)
        .where(and(eq(weeks.id, weekId), eq(weeks.userId, userId)))
        .limit(1);
      if (!row) {
        throw new NotFoundException('Semana no encontrada');
      }
      if (row.estado !== 'DEFICIT') {
        throw new BadRequestException(
          `Solo se puede invertir colchón en semanas DEFICIT (estado actual: ${row.estado})`,
        );
      }

      const falta = META_SEMANAL - row.xpTotal;
      if (falta <= 0) {
        throw new BadRequestException('La semana ya cumple la meta');
      }

      // Colchón disponible: total recibido − total invertido (excluida
      // esta semana, porque su `colchonInvertido` es 0 en DEFICIT).
      const colchonDisp = await this.computeColchonTotal(userId);
      if (colchonDisp < falta) {
        throw new BadRequestException(
          `Colchón insuficiente: necesitas ${falta} XP y dispones de ${colchonDisp}`,
        );
      }

      const [updated] = await tx
        .update(weeks)
        .set({
          estado: 'COMPENSADA',
          colchonInvertido: falta,
          updatedAt: new Date(),
        })
        .where(eq(weeks.id, weekId))
        .returning();

      if (!updated) throw new Error('Update no devolvió fila');
      return this.toStatus(updated, false);
    });
  }

  // ─── Internals ──────────────────────────────────────────────────

  private async materializeClosedWeeks(
    userId: string,
    lunesPrimera: string,
    lunesActual: string,
  ): Promise<void> {
    if (lunesPrimera >= lunesActual) return; // sólo está la semana actual

    // Conjunto de inicios ya materializados.
    const existing = await this.db
      .select({ inicio: weeks.inicio })
      .from(weeks)
      .where(
        and(
          eq(weeks.userId, userId),
          gte(weeks.inicio, lunesPrimera),
          // No incluimos la actual (no se materializa).
        ),
      );
    const setExisting = new Set(existing.map((e) => e.inicio));

    for (
      let cursorMs = isoMs(lunesPrimera);
      cursorMs < isoMs(lunesActual); // estricto: no incluye la actual
      cursorMs += 7 * MS_DIA
    ) {
      const inicio = isoDate(new Date(cursorMs));
      if (setExisting.has(inicio)) continue;

      const fin = isoDate(new Date(cursorMs + 6 * MS_DIA));
      const xpTotal = await this.sumXpRange(userId, inicio, fin);
      const excedente = Math.max(0, xpTotal - META_SEMANAL);
      const estado = xpTotal >= META_SEMANAL ? 'MAS_XP' : 'DEFICIT';
      const colchonRecibido = excedente;
      const cerradaAt = new Date(isoMs(fin) + (24 * 60 * 60 * 1000 - 1));

      await this.db.insert(weeks).values({
        userId,
        inicio,
        fin,
        xpTotal,
        estado,
        colchonRecibido,
        colchonInvertido: 0,
        cerradaAt,
      });
    }
  }

  private async sumXpRange(userId: string, from: string, to: string): Promise<number> {
    const [{ s = 0 } = {}] = await this.db
      .select({ s: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(
        and(
          eq(xpLog.userId, userId),
          gte(xpLog.fecha, from),
          lte(xpLog.fecha, to),
        ),
      );
    return s;
  }

  async computeColchonTotal(userId: string): Promise<number> {
    const [{ recibido = 0, invertido = 0 } = {}] = await this.db
      .select({
        recibido: sql<number>`COALESCE(SUM(${weeks.colchonRecibido}), 0)::int`,
        invertido: sql<number>`COALESCE(SUM(${weeks.colchonInvertido}), 0)::int`,
      })
      .from(weeks)
      .where(eq(weeks.userId, userId));

    // Las compras de nivel también descuentan del colchón.
    const [{ comprado = 0 } = {}] = await this.db
      .select({
        comprado: sql<number>`COALESCE(SUM(${levelPurchases.xpInvertida}), 0)::int`,
      })
      .from(levelPurchases)
      .where(eq(levelPurchases.userId, userId));

    return Math.max(0, recibido - invertido - comprado);
  }

  private toStatus(
    row: typeof weeks.$inferSelect,
    enCurso: boolean,
  ): WeekStatus {
    const xpTotal = row.xpTotal;
    return {
      id: row.id,
      inicio: row.inicio,
      fin: row.fin,
      xpTotal,
      estado: enCurso ? 'EN_CURSO' : row.estado,
      colchonRecibido: row.colchonRecibido,
      colchonInvertido: row.colchonInvertido,
      cerradaAt: row.cerradaAt?.toISOString() ?? null,
      pctPropio: clamp01(xpTotal / META_SEMANAL),
      pctColchon: clamp01(row.colchonInvertido / META_SEMANAL),
      excedente: Math.max(0, xpTotal - META_SEMANAL),
      puedeInvertirColchon: row.estado === 'DEFICIT',
    };
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoMs(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getTime();
}

function startOfWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0 dom..6 sáb
  const offset = day === 0 ? 6 : day - 1;
  return isoDate(new Date(d.getTime() - offset * MS_DIA));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
