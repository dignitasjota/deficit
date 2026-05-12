import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  calcBMR,
  calcLevelState,
  calcMilestoneState,
  HITOS_POR_DEFECTO,
  type Milestone,
} from '@perdida-peso/domain';
import type {
  LogPageQuery,
  ManualXpInput,
  MilestoneDto,
  XpLogEntryDto,
  XpLogPage,
  XpSummary,
} from '@perdida-peso/schemas';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { dailyWeight } from '../db/schema/daily_weight.js';
import { levelPurchases } from '../db/schema/level_purchases.js';
import { milestones as milestonesTable } from '../db/schema/milestones.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { xpLog } from '../db/schema/xp_log.js';
import { WeeksService } from '../weeks/weeks.service.js';

const NIVEL_DESTINO = 80;

const MS_DIA = 24 * 60 * 60 * 1000;
const XP_SEMANAL_META = 7700;

@Injectable()
export class XpService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly weeks: WeeksService,
  ) {}

  async getSummary(userId: string): Promise<XpSummary> {
    // 1. Perfil + versión vigente.
    const [perfil] = await this.db
      .select({
        currentVersionId: userProfile.currentVersionId,
        fechaInicio: userProfile.fechaInicio,
        pesoInicialKg: profileVersion.pesoInicialKg,
        pesoObjetivoKg: profileVersion.pesoObjetivoKg,
        alturaCm: profileVersion.alturaCm,
        edad: profileVersion.edad,
        sexo: profileVersion.sexo,
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

    // 2. xpTotal acumulada.
    const [{ xpTotal = 0 } = {}] = await this.db
      .select({ xpTotal: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(eq(xpLog.userId, userId));

    const levelStateNatural = calcLevelState(xpTotal, xpPorNivel);

    // Niveles comprados desde el camino al destino (Fase 11).
    const [{ nivelesComprados = 0 } = {}] = await this.db
      .select({
        nivelesComprados: sql<number>`COUNT(*)::int`,
      })
      .from(levelPurchases)
      .where(eq(levelPurchases.userId, userId));

    const nivelActual = Math.min(
      NIVEL_DESTINO,
      levelStateNatural.nivelActual + nivelesComprados,
    );
    const jefeFinalSuperado = nivelActual >= NIVEL_DESTINO;

    // El estado dentro del nivel actual sigue dependiendo de la XP
    // natural: una compra suma 1 nivel pero no avanza el progreso del
    // siguiente nivel. Si se ha llegado a 80 (jefe final), normalizamos
    // los campos de progreso a "completado".
    const levelState = jefeFinalSuperado
      ? {
          nivelActual: NIVEL_DESTINO,
          xpEnNivel: xpPorNivel,
          xpFalta: 0,
          progresoPct: 1,
          jefeFinalSuperado: true,
        }
      : {
          ...levelStateNatural,
          nivelActual,
          jefeFinalSuperado,
        };

    // 3. Hitos del usuario (con alcanzado calculado en código).
    const hitosRows = await this.db
      .select({
        nivel: milestonesTable.nivel,
        nombre: milestonesTable.nombre,
        color: milestonesTable.color,
        alcanzadoAt: milestonesTable.alcanzadoAt,
      })
      .from(milestonesTable)
      .where(eq(milestonesTable.userId, userId))
      .orderBy(asc(milestonesTable.nivel));

    const hitosDto: MilestoneDto[] = hitosRows.map((h) => ({
      nivel: h.nivel,
      nombre: h.nombre,
      color: h.color,
      alcanzado: h.nivel <= levelState.nivelActual,
      alcanzadoAt: h.alcanzadoAt?.toISOString() ?? null,
    }));

    // calcMilestoneState requiere los hitos como Milestone del domain.
    const hitosDomain: Milestone[] =
      hitosRows.length > 0
        ? hitosRows.map((h) => ({ nivel: h.nivel, nombre: h.nombre, color: h.color ?? undefined }))
        : [...HITOS_POR_DEFECTO];

    const milestoneState = calcMilestoneState({
      nivelActual: levelState.nivelActual,
      xpEnNivel: levelState.xpEnNivel,
      xpPorNivel,
      hitos: hitosDomain,
    });

    const proximoHitoDto: MilestoneDto | null = milestoneState.proximo
      ? (hitosDto.find((h) => h.nivel === milestoneState.proximo!.nivel) ?? {
          nivel: milestoneState.proximo.nivel,
          nombre: milestoneState.proximo.nombre,
          color: milestoneState.proximo.color ?? null,
          alcanzado: false,
          alcanzadoAt: null,
        })
      : null;

    // 4. Stats agregados.
    const stats = await this.computeStats(userId, perfil);

    // 5. xpDiaEstimado: el mayor entre la media real y el ritmo objetivo
    //    (7700/7 ≈ 1100). Eso evita "~999d" en cuentas recién creadas.
    const xpDiaEstimado = Math.max(stats.xpMediaDia, XP_SEMANAL_META / 7);

    return {
      xpTotal,
      nivelActual: levelState.nivelActual,
      xpEnNivel: levelState.xpEnNivel,
      xpFalta: levelState.xpFalta,
      progresoPct: levelState.progresoPct,
      xpPorNivel,
      nivelesPorSemana,
      jefeFinalSuperado: milestoneState.jefeFinalSuperado,
      hitos: hitosDto,
      proximoHito: proximoHitoDto,
      xpFaltaHito: milestoneState.xpFalta,
      xpDiaEstimado,
      stats,
    };
  }

  async addManual(userId: string, input: ManualXpInput): Promise<{ id: string; xp: number }> {
    // Necesitamos el `current_version_id` para escribir el xp_log.
    const [perfil] = await this.db
      .select({ currentVersionId: userProfile.currentVersionId })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (!perfil) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }

    const [row] = await this.db
      .insert(xpLog)
      .values({
        userId,
        profileVersionId: perfil.currentVersionId,
        fecha: input.fecha,
        tipo: 'M',
        descripcion: input.descripcion,
        xp: input.xp,
      })
      .returning({ id: xpLog.id, xp: xpLog.xp });

    if (!row) throw new Error('No se pudo insertar la entrada de xp_log');
    return row;
  }

  async getLog(userId: string, query: LogPageQuery): Promise<XpLogPage> {
    const cursor = decodeCursor(query.cursor);
    const limit = query.limit;

    // Cursor: (created_at, id) DESC. Tuple comparison para evitar
    // duplicados cuando dos filas comparten created_at.
    const conditions = [eq(xpLog.userId, userId)];
    if (cursor) {
      conditions.push(
        sql`(${xpLog.createdAt}, ${xpLog.id}) < (${cursor.createdAt}, ${cursor.id})`,
      );
    }

    const rows = await this.db
      .select({
        id: xpLog.id,
        fecha: xpLog.fecha,
        tipo: xpLog.tipo,
        descripcion: xpLog.descripcion,
        xp: xpLog.xp,
        createdAt: xpLog.createdAt,
      })
      .from(xpLog)
      .where(and(...conditions))
      .orderBy(desc(xpLog.createdAt), desc(xpLog.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    const entries: XpLogEntryDto[] = slice.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      descripcion: r.descripcion,
      xp: r.xp,
      createdAt: r.createdAt.toISOString(),
    }));

    const [{ total = 0 } = {}] = await this.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(xpLog)
      .where(eq(xpLog.userId, userId));

    return { entries, nextCursor, total };
  }

  private async computeStats(
    userId: string,
    perfil: {
      pesoInicialKg: string;
      alturaCm: string;
      edad: number;
      sexo: 'M' | 'F';
      fechaInicio: string;
    },
  ): Promise<XpSummary['stats']> {
    const hoy = new Date();
    const hoyIso = hoy.toISOString().slice(0, 10);
    const lunesActual = startOfWeekIso(hoy);

    // xp de hoy
    const [{ xpHoy = 0 } = {}] = await this.db
      .select({ xpHoy: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(and(eq(xpLog.userId, userId), eq(xpLog.fecha, hoyIso)));

    // xp de la semana actual (lun-dom)
    const [{ xpSemana = 0 } = {}] = await this.db
      .select({ xpSemana: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int` })
      .from(xpLog)
      .where(and(eq(xpLog.userId, userId), gte(xpLog.fecha, lunesActual)));

    // xp media por día desde fecha_inicio (o desde 1er log si más reciente).
    const [{ xpTotal = 0, dias = 1 } = {}] = await this.db
      .select({
        xpTotal: sql<number>`COALESCE(SUM(${xpLog.xp}), 0)::int`,
        dias: sql<number>`GREATEST(1, (CURRENT_DATE - DATE(${perfil.fechaInicio}))::int + 1)::int`,
      })
      .from(xpLog)
      .where(eq(xpLog.userId, userId));

    const xpMediaDia = xpTotal / Math.max(1, dias);

    // BMR usando el último peso báscula (o pesoInicial si no hay).
    const [pesoRow] = await this.db
      .select({ pesoKg: dailyWeight.pesoKg })
      .from(dailyWeight)
      .where(eq(dailyWeight.userId, userId))
      .orderBy(desc(dailyWeight.fecha))
      .limit(1);

    const pesoActualKg = pesoRow ? Number(pesoRow.pesoKg) : Number(perfil.pesoInicialKg);
    const bmr = calcBMR({
      pesoKg: pesoActualKg,
      alturaCm: Number(perfil.alturaCm),
      edad: perfil.edad,
      sexo: perfil.sexo,
    });

    // Racha: días consecutivos con xp > 0 desde hoy hacia atrás.
    const rachaDias = await this.computeRacha(userId, hoyIso);

    // Colchón: SUM(colchon_recibido − colchon_invertido) de la tabla weeks.
    const colchon = await this.weeks.computeColchonTotal(userId);

    return {
      xpHoy,
      xpMediaDia,
      xpSemanaActual: xpSemana,
      bmr,
      rachaDias,
      colchon,
    };
  }

  private async computeRacha(userId: string, hoyIso: string): Promise<number> {
    // Trae los últimos 60 días con XP > 0 y cuenta los consecutivos desde
    // hoy. 60 días es un tope razonable; si la racha es más larga, se
    // recalcula la próxima vez y suma.
    const rows = await this.db
      .select({ fecha: xpLog.fecha, suma: sql<number>`SUM(${xpLog.xp})::int` })
      .from(xpLog)
      .where(eq(xpLog.userId, userId))
      .groupBy(xpLog.fecha)
      .orderBy(desc(xpLog.fecha))
      .limit(60);

    let racha = 0;
    let cursorMs = new Date(hoyIso).getTime();

    for (const row of rows) {
      if (row.suma <= 0) continue;
      const fechaMs = new Date(row.fecha).getTime();
      if (fechaMs === cursorMs) {
        racha += 1;
        cursorMs -= MS_DIA;
      } else if (fechaMs < cursorMs) {
        // Si el primer log es de ayer (no hay nada de hoy), la racha sigue
        // contando desde ayer.
        if (racha === 0 && fechaMs === cursorMs - MS_DIA) {
          racha += 1;
          cursorMs = fechaMs - MS_DIA;
          continue;
        }
        break;
      }
    }

    return racha;
  }
}

function startOfWeekIso(d: Date): string {
  // Lunes de la semana actual (en UTC para evitar saltos por timezone).
  const day = d.getUTCDay(); // 0 dom..6 sáb
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(d.getTime() - offset * MS_DIA);
  return monday.toISOString().slice(0, 10);
}
