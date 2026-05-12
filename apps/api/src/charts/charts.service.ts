import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  KCAL_POR_KG_GRASA,
  RANGO_MAX_RATIO,
  RANGO_MIN_RATIO,
  calcMovingAverage,
  calcRetention,
} from '@perdida-peso/domain';
import type {
  WeightChartPoint,
  WeightChartRange,
  WeightChartResponse,
} from '@perdida-peso/schemas';
import { and, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { dailyEntry } from '../db/schema/daily_entry.js';
import { dailyWeight } from '../db/schema/daily_weight.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { xpLog } from '../db/schema/xp_log.js';

const MS_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class ChartsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getWeightChart(userId: string, range: WeightChartRange): Promise<WeightChartResponse> {
    // 1. Perfil + fecha de inicio.
    const [perfil] = await this.db
      .select({
        fechaInicio: userProfile.fechaInicio,
        pesoInicialKg: profileVersion.pesoInicialKg,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (!perfil) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }

    const pesoInicialKg = Number(perfil.pesoInicialKg);
    const fechaInicio = perfil.fechaInicio;
    const today = new Date();
    const todayIso = isoDate(today);

    const rangeStart = computeRangeStart(range, fechaInicio, today);

    // 2. Series de la BBDD (filtradas por rango).
    const [pesos, entries, xps] = await Promise.all([
      this.db
        .select({ fecha: dailyWeight.fecha, pesoKg: dailyWeight.pesoKg })
        .from(dailyWeight)
        .where(
          and(
            eq(dailyWeight.userId, userId),
            gte(dailyWeight.fecha, rangeStart),
            lte(dailyWeight.fecha, todayIso),
          ),
        )
        .orderBy(dailyWeight.fecha),
      this.db
        .select({ fecha: dailyEntry.fecha, sodioG: dailyEntry.sodioG })
        .from(dailyEntry)
        .where(
          and(
            eq(dailyEntry.userId, userId),
            gte(dailyEntry.fecha, rangeStart),
            lte(dailyEntry.fecha, todayIso),
          ),
        ),
      // Necesitamos xp_log desde el inicio del histórico (no del rango)
      // para calcular xpAcumulado correcto en cada punto.
      this.db
        .select({
          fecha: xpLog.fecha,
          suma: sql<number>`SUM(${xpLog.xp})::int`,
        })
        .from(xpLog)
        .where(and(eq(xpLog.userId, userId), lte(xpLog.fecha, todayIso)))
        .groupBy(xpLog.fecha)
        .orderBy(xpLog.fecha),
    ]);

    const mapPesos = new Map<string, number>(
      pesos.map((p) => [p.fecha, Number(p.pesoKg)]),
    );
    const mapSodio = new Map<string, number>();
    for (const e of entries) {
      if (e.sodioG !== null) mapSodio.set(e.fecha, Number(e.sodioG));
    }

    // xpAcumulado por fecha: prefix sum de la serie de xp_log.
    const xpAcumPorFecha = new Map<string, number>();
    {
      let acum = 0;
      for (const x of xps) {
        acum += x.suma;
        xpAcumPorFecha.set(x.fecha, acum);
      }
    }

    // Pre-cálculo de pesos previos al rango (solo los del histórico
    // necesarios para que la media 7d del primer punto del rango sea
    // realista: sus 6 anteriores).
    const pesosPrevios = await this.db
      .select({ fecha: dailyWeight.fecha, pesoKg: dailyWeight.pesoKg })
      .from(dailyWeight)
      .where(and(eq(dailyWeight.userId, userId), lt(dailyWeight.fecha, rangeStart)))
      .orderBy(sql`${dailyWeight.fecha} DESC`)
      .limit(6);
    // Reverso a orden cronológico ascendente para que la ventana móvil
    // funcione (los más recientes al final).
    const ventana: number[] = pesosPrevios
      .map((p) => Number(p.pesoKg))
      .reverse();

    // 3. Iterar día a día.
    const puntos: WeightChartPoint[] = [];
    let xpAcumLast = 0; // último xpAcum conocido al iterar
    // Pre-poblar xpAcumLast con la suma de xp anteriores al rangeStart.
    for (const x of xps) {
      if (x.fecha < rangeStart) {
        xpAcumLast += x.suma;
      } else {
        break;
      }
    }

    const startMs = new Date(rangeStart + 'T00:00:00Z').getTime();
    const endMs = new Date(todayIso + 'T00:00:00Z').getTime();

    for (let cursor = startMs; cursor <= endMs; cursor += MS_DIA) {
      const fechaIso = isoDate(new Date(cursor));
      const pesoReal = mapPesos.get(fechaIso) ?? null;

      if (pesoReal !== null) {
        ventana.push(pesoReal);
        if (ventana.length > 7) ventana.shift();
      }
      const media7d = calcMovingAverage(ventana, 7);

      // xpAcumulado a esta fecha (incluida).
      const xpDeHoy = xpAcumPorFecha.has(fechaIso)
        ? xpAcumPorFecha.get(fechaIso)!
        : null;
      if (xpDeHoy !== null) xpAcumLast = xpDeHoy;

      const pesoTeorico = pesoInicialKg - xpAcumLast / KCAL_POR_KG_GRASA;
      const sodioG = mapSodio.get(fechaIso) ?? 0;
      const ret = calcRetention(sodioG);
      const rangoMin = pesoTeorico + ret.retTotal * RANGO_MIN_RATIO;
      const rangoMax = pesoTeorico + ret.retTotal * RANGO_MAX_RATIO;

      puntos.push({
        fecha: fechaIso,
        pesoReal,
        media7d,
        pesoTeorico,
        rangoMin,
        rangoMax,
      });
    }

    // 4. Stats sobre pesoReal del rango.
    const pesosReales = puntos.map((p) => p.pesoReal).filter((v): v is number => v !== null);
    const min = pesosReales.length > 0 ? Math.min(...pesosReales) : null;
    const max = pesosReales.length > 0 ? Math.max(...pesosReales) : null;
    const delta =
      pesosReales.length >= 2
        ? pesosReales[pesosReales.length - 1]! - pesosReales[0]!
        : null;

    return { range, puntos, stats: { min, max, delta } };
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeRangeStart(range: WeightChartRange, fechaInicio: string, today: Date): string {
  const todayMs = new Date(isoDate(today) + 'T00:00:00Z').getTime();
  let startMs: number;
  switch (range) {
    case '7d':
      startMs = todayMs - 6 * MS_DIA; // 7 días incluyendo hoy
      break;
    case '30d':
      startMs = todayMs - 29 * MS_DIA;
      break;
    case '90d':
      startMs = todayMs - 89 * MS_DIA;
      break;
    case 'all':
    default: {
      const inicioMs = new Date(fechaInicio + 'T00:00:00Z').getTime();
      startMs = inicioMs;
      break;
    }
  }

  // No retroceder más allá de fecha_inicio del usuario.
  const inicioMs = new Date(fechaInicio + 'T00:00:00Z').getTime();
  if (startMs < inicioMs) startMs = inicioMs;

  return isoDate(new Date(startMs));
}
