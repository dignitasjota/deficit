import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  forecastDestination,
  forecastLevelDates,
  NIVEL_DESTINO,
} from '@perdida-peso/domain';
import type {
  PathDestination,
  ReachedLevel,
  UpcomingLevel,
} from '@perdida-peso/schemas';
import { asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { levelPurchases } from '../db/schema/level_purchases.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { xpLog } from '../db/schema/xp_log.js';
import { WeeksService } from '../weeks/weeks.service.js';

@Injectable()
export class PathService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly weeksService: WeeksService,
  ) {}

  async getDestination(userId: string): Promise<PathDestination> {
    // 1. Perfil + xpPorNivel.
    const [perfil] = await this.db
      .select({
        xpPorNivel: profileVersion.xpPorNivel,
        nivelesPorSemana: profileVersion.nivelesPorSemana,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);
    if (!perfil) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }
    const xpPorNivel = Number(perfil.xpPorNivel);
    const nivelesPorSemana = Number(perfil.nivelesPorSemana);
    const costePorCompra = Math.round(xpPorNivel);

    // 2. Eventos cronológicos: cruces naturales y compras.
    const eventosCronologicos = await this.computeReachedEvents(userId, xpPorNivel);
    const nivelesNaturales = eventosCronologicos.filter((e) => e.origin === 'NATURAL').length;
    const nivelesComprados = eventosCronologicos.filter((e) => e.origin === 'COMPRADA').length;
    const nivelActual = Math.min(NIVEL_DESTINO, nivelesNaturales + nivelesComprados);

    // 3. Numerar los conseguidos en orden cronológico ASC y devolver DESC.
    const conseguidos: ReachedLevel[] = eventosCronologicos
      .map((e, i) => ({
        nivel: i + 1,
        origin: e.origin,
        fecha: e.fecha,
      }))
      .reverse();

    // 4. Por venir: del nivelActual+1 al 80.
    const colchonDisponible = await this.weeksService.computeColchonTotal(userId);
    const xpTotal = await this.sumXp(userId);
    const xpEnNivel = xpPorNivel > 0 ? xpTotal % xpPorNivel : 0;
    const forecast = forecastDestination({
      nivelActual,
      xpEnNivel,
      xpPorNivel,
      colchonDisponible,
      hoy: new Date(),
    });

    const upcoming = forecastLevelDates({
      nivelActual,
      nivelesPorSemana,
      hoy: new Date(),
      hastaNivel: NIVEL_DESTINO,
    });
    const porVenir: UpcomingLevel[] = upcoming.map((u) => ({
      nivel: u.nivel,
      fechaEstimada: u.fechaEstimada.toISOString(),
    }));

    return {
      nivelActual,
      nivelesNaturales,
      nivelesComprados,
      destino: NIVEL_DESTINO,
      nivelesRestantes: NIVEL_DESTINO - nivelActual,
      pctCamino: NIVEL_DESTINO > 0 ? nivelActual / NIVEL_DESTINO : 0,
      llegadaEstimada: forecast.fechaEstimada.toISOString(),
      semanasRestantes: forecast.semanasRestantes,
      colchonDisponible,
      costePorCompra,
      puedeComprar: colchonDisponible >= costePorCompra && nivelActual < NIVEL_DESTINO,
      conseguidos,
      porVenir,
    };
  }

  async buyLevel(userId: string): Promise<{ nivelComprado: number; nivelActual: number; colchonRestante: number }> {
    return this.db.transaction(async (tx) => {
      const [perfil] = await tx
        .select({ xpPorNivel: profileVersion.xpPorNivel })
        .from(userProfile)
        .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
        .where(eq(userProfile.userId, userId))
        .limit(1);
      if (!perfil) {
        throw new NotFoundException('El usuario aún no tiene perfil');
      }
      const xpPorNivel = Number(perfil.xpPorNivel);
      const coste = Math.round(xpPorNivel);

      // Recuento actual.
      const [{ xpTotal = 0 } = {}] = await tx
        .select({ xpTotal: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
        .from(xpLog)
        .where(eq(xpLog.userId, userId));
      const [{ comprados = 0 } = {}] = await tx
        .select({ comprados: sql<number>`COUNT(*)::int` })
        .from(levelPurchases)
        .where(eq(levelPurchases.userId, userId));

      const naturales = Math.min(NIVEL_DESTINO, Math.floor(xpTotal / xpPorNivel));
      const nivelActual = Math.min(NIVEL_DESTINO, naturales + comprados);

      if (nivelActual >= NIVEL_DESTINO) {
        throw new BadRequestException(
          'Ya estás en el nivel destino (L80). No puedes comprar más niveles.',
        );
      }

      const colchonDisp = await this.weeksService.computeColchonTotal(userId);
      if (colchonDisp < coste) {
        throw new BadRequestException(
          `Colchón insuficiente: necesitas ${coste} XP y dispones de ${colchonDisp}`,
        );
      }

      // El siguiente nivel comprado será (comprados + 1).
      // Lo numeramos así para evitar colisiones con la UNIQUE (user_id, nivel).
      const nivelDeCompra = comprados + 1;

      await tx.insert(levelPurchases).values({
        userId,
        nivel: nivelDeCompra,
        xpInvertida: coste,
      });

      const colchonRestante = colchonDisp - coste;
      return {
        nivelComprado: nivelActual + 1,
        nivelActual: nivelActual + 1,
        colchonRestante,
      };
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async sumXp(userId: string): Promise<number> {
    const [{ s = 0 } = {}] = await this.db
      .select({ s: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(eq(xpLog.userId, userId));
    return s;
  }

  /**
   * Construye lista cronológica ASC de eventos "nivel alcanzado":
   *  - Compras: una entrada por cada level_purchase con su comprada_at.
   *  - Naturales: cada vez que xp_acumulado cruza un múltiplo de
   *    xpPorNivel, una entrada con la fecha del xp_log que provocó el
   *    cruce.
   */
  private async computeReachedEvents(
    userId: string,
    xpPorNivel: number,
  ): Promise<Array<{ origin: 'NATURAL' | 'COMPRADA'; fecha: string }>> {
    if (xpPorNivel <= 0) return [];

    const xpEvents = await this.db
      .select({ xp: xpLog.xp, createdAt: xpLog.createdAt })
      .from(xpLog)
      .where(eq(xpLog.userId, userId))
      .orderBy(asc(xpLog.fecha), asc(xpLog.createdAt));

    const eventos: Array<{ origin: 'NATURAL' | 'COMPRADA'; fecha: string }> = [];
    let acum = 0;
    let nivelAcumulado = 0;
    for (const e of xpEvents) {
      acum += e.xp;
      const nuevoNivel = Math.min(NIVEL_DESTINO, Math.floor(acum / xpPorNivel));
      while (nivelAcumulado < nuevoNivel) {
        nivelAcumulado += 1;
        eventos.push({ origin: 'NATURAL', fecha: e.createdAt.toISOString() });
      }
    }

    const compras = await this.db
      .select({ compradaAt: levelPurchases.compradaAt })
      .from(levelPurchases)
      .where(eq(levelPurchases.userId, userId))
      .orderBy(asc(levelPurchases.compradaAt));
    for (const c of compras) {
      eventos.push({ origin: 'COMPRADA', fecha: c.compradaAt.toISOString() });
    }

    eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return eventos;
  }
}
