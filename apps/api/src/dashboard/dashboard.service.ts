import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  calcExpectedRange,
  calcMovingAverage,
  evaluarPesoEnRango,
} from '@perdida-peso/domain';
import type { DashboardHeader, EstadoBascula } from '@perdida-peso/schemas';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { dailyEntry } from '../db/schema/daily_entry.js';
import { dailyWeight } from '../db/schema/daily_weight.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { xpLog } from '../db/schema/xp_log.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Devuelve el snapshot del header del dashboard:
   *   - peso báscula del día (o último registrado si hoy no hay)
   *   - media móvil 7d
   *   - peso teórico (peso_inicial - xpTotal/7700)
   *   - rango esperado con desglose de retención
   *   - estado vs rango (DENTRO / FUERA_ARRIBA / FUERA_ABAJO / NO_REGISTRADO)
   */
  async getHeader(userId: string): Promise<DashboardHeader> {
    // 1. Perfil vigente del usuario (peso_inicial, etc.)
    const [perfilRow] = await this.db
      .select({
        pesoInicialKg: profileVersion.pesoInicialKg,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (!perfilRow) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }

    const pesoInicialKg = Number(perfilRow.pesoInicialKg);

    // 2. Últimos pesos para báscula del día y media 7d.
    const ultimosPesos = await this.db
      .select({ fecha: dailyWeight.fecha, pesoKg: dailyWeight.pesoKg })
      .from(dailyWeight)
      .where(eq(dailyWeight.userId, userId))
      .orderBy(desc(dailyWeight.fecha))
      .limit(7);

    const hoyIso = new Date().toISOString().slice(0, 10);
    const pesoBasculaHoy = ultimosPesos.find((p) => p.fecha === hoyIso) ?? null;
    const ultimoPeso = ultimosPesos[0] ?? null;

    const pesoVisible = pesoBasculaHoy ?? ultimoPeso;

    // Convertir y ordenar ascendentemente para calcMovingAverage (espera serie cronológica).
    const pesosOrdenados = [...ultimosPesos]
      .reverse()
      .map((p) => Number(p.pesoKg));
    const media7d = calcMovingAverage(pesosOrdenados, 7);

    // 3. XP total acumulada.
    const [{ xpTotal = 0 } = {}] = await this.db
      .select({ xpTotal: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(eq(xpLog.userId, userId));

    // 4. Sodio del día (de daily_entry).
    const [entryRow] = await this.db
      .select({ sodioG: dailyEntry.sodioG })
      .from(dailyEntry)
      .where(and(eq(dailyEntry.userId, userId), eq(dailyEntry.fecha, hoyIso)))
      .limit(1);

    const sodioG = entryRow?.sodioG !== undefined && entryRow.sodioG !== null
      ? Number(entryRow.sodioG)
      : 0;

    // 5. Rango esperado y peso teórico.
    const range = calcExpectedRange(pesoInicialKg, xpTotal, sodioG);

    let estadoBascula: EstadoBascula;
    let baselineDrift: number | null = null;
    if (pesoBasculaHoy) {
      estadoBascula = evaluarPesoEnRango(Number(pesoBasculaHoy.pesoKg), range);
      if (media7d !== null) {
        baselineDrift = Number(pesoBasculaHoy.pesoKg) - media7d;
      }
    } else {
      estadoBascula = 'NO_REGISTRADO';
    }

    return {
      pesoHoy: pesoVisible ? Number(pesoVisible.pesoKg) : null,
      pesoFecha: pesoVisible?.fecha ?? null,
      media7d,
      pesoTeorico: range.pesoTeorico,
      xpTotal,
      sodioG,
      rangoEsperado: {
        rangoMin: range.rangoMin,
        rangoMax: range.rangoMax,
        retencion: range.retencion,
        estadoBascula,
        baselineDrift,
      },
    };
  }
}
