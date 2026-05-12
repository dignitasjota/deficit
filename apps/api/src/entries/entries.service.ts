import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  calcBMR,
  calcDeficitXP,
  calcEffectiveLitros,
  calcExerciseXP,
  calcHydrationGoal,
  calcStepXP,
  calcTDEE,
  type FactorActividad,
} from '@perdida-peso/domain';
import type {
  DailyEntry,
  DailyEntryInput,
  ExerciseLog,
  ExerciseLogInput,
} from '@perdida-peso/schemas';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { attributeLog } from '../db/schema/attribute_log.js';
import { dailyEntry } from '../db/schema/daily_entry.js';
import { dailyWeight } from '../db/schema/daily_weight.js';
import { exerciseLog } from '../db/schema/exercise_log.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';
import { xpLog } from '../db/schema/xp_log.js';

/**
 * Snapshot del perfil + último peso. Evita queries repetidas durante un
 * recálculo.
 */
interface ProfileSnapshot {
  currentVersionId: string;
  pesoActualKg: number;
  alturaCm: number;
  edad: number;
  sexo: 'M' | 'F';
  factorActividad: FactorActividad;
}

@Injectable()
export class EntriesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ─── Daily entry ────────────────────────────────────────────────
  async get(userId: string, fecha: string): Promise<DailyEntry> {
    const [row] = await this.db
      .select()
      .from(dailyEntry)
      .where(and(eq(dailyEntry.userId, userId), eq(dailyEntry.fecha, fecha)))
      .limit(1);

    return this.toDto(userId, fecha, row ?? null, await this.hasHidAttribute(userId, fecha));
  }

  async upsert(userId: string, fecha: string, input: DailyEntryInput): Promise<DailyEntry> {
    const profile = await this.loadProfile(userId);

    return this.db.transaction(async (tx) => {
      // 1. Upsert daily_entry con los campos provistos.
      const valuesToSet = this.normaliseInput(input);
      const valuesToInsert = {
        userId,
        fecha,
        ...valuesToSet,
      };

      const [merged] = await tx
        .insert(dailyEntry)
        .values(valuesToInsert)
        .onConflictDoUpdate({
          target: [dailyEntry.userId, dailyEntry.fecha],
          set: { ...valuesToSet, updatedAt: new Date() },
        })
        .returning();

      if (!merged) throw new Error('Upsert daily_entry no devolvió fila');

      // 2. Recalcular xp_log para tipos P y C de este día.
      await this.rewriteStepDeficitXp(tx, userId, fecha, merged, profile);

      // 3. Atributo HID según meta de hidratación cumplida.
      const hidGiven = await this.syncHidAttribute(tx, userId, fecha, merged);

      // 4. Atributo PRO según productividad declarada.
      await this.syncProAttribute(tx, userId, fecha, merged.productividad);

      return this.toDto(userId, fecha, merged, hidGiven);
    });
  }

  // ─── Exercise log ───────────────────────────────────────────────
  async listExercises(userId: string, fecha: string): Promise<ExerciseLog[]> {
    const rows = await this.db
      .select({
        id: exerciseLog.id,
        fecha: exerciseLog.fecha,
        tipo: exerciseLog.tipo,
        nombre: exerciseLog.nombre,
        minutos: exerciseLog.minutos,
        kcalQuemadas: exerciseLog.kcalQuemadas,
        createdAt: exerciseLog.createdAt,
      })
      .from(exerciseLog)
      .where(and(eq(exerciseLog.userId, userId), eq(exerciseLog.fecha, fecha)))
      .orderBy(asc(exerciseLog.createdAt));

    return rows.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      nombre: r.nombre,
      minutos: r.minutos,
      kcalQuemadas: r.kcalQuemadas,
      xpOtorgada: r.kcalQuemadas !== null ? calcExerciseXP(r.kcalQuemadas) : 0,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async addExercise(userId: string, input: ExerciseLogInput): Promise<ExerciseLog> {
    const profile = await this.loadProfile(userId);

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(exerciseLog)
        .values({
          userId,
          fecha: input.fecha,
          tipo: input.tipo,
          nombre: input.nombre,
          minutos: input.minutos ?? null,
          kcalQuemadas: input.kcalQuemadas ?? null,
        })
        .returning();

      if (!row) throw new Error('Insert exercise_log no devolvió fila');

      // Reescribir todas las filas xp_log de tipo L del día (idempotente).
      await this.rewriteExerciseXp(tx, userId, input.fecha, profile.currentVersionId);

      const xpOtorgada = row.kcalQuemadas !== null ? calcExerciseXP(row.kcalQuemadas) : 0;
      return {
        id: row.id,
        fecha: row.fecha,
        tipo: row.tipo,
        nombre: row.nombre,
        minutos: row.minutos,
        kcalQuemadas: row.kcalQuemadas,
        xpOtorgada,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async deleteExercise(userId: string, exerciseId: string): Promise<void> {
    const profile = await this.loadProfile(userId);

    await this.db.transaction(async (tx) => {
      // Buscar la fecha antes de borrar para poder reescribir xp_log.
      const [row] = await tx
        .select({ fecha: exerciseLog.fecha })
        .from(exerciseLog)
        .where(and(eq(exerciseLog.id, exerciseId), eq(exerciseLog.userId, userId)))
        .limit(1);

      if (!row) {
        throw new NotFoundException('Ejercicio no encontrado');
      }

      await tx
        .delete(exerciseLog)
        .where(and(eq(exerciseLog.id, exerciseId), eq(exerciseLog.userId, userId)));

      await this.rewriteExerciseXp(tx, userId, row.fecha, profile.currentVersionId);
    });
  }

  // ─── Internals ──────────────────────────────────────────────────
  private async loadProfile(userId: string): Promise<ProfileSnapshot> {
    const [perfil] = await this.db
      .select({
        currentVersionId: userProfile.currentVersionId,
        pesoInicialKg: profileVersion.pesoInicialKg,
        alturaCm: profileVersion.alturaCm,
        edad: profileVersion.edad,
        sexo: profileVersion.sexo,
        factorActividad: profileVersion.factorActividad,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (!perfil) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }

    const [pesoRow] = await this.db
      .select({ pesoKg: dailyWeight.pesoKg })
      .from(dailyWeight)
      .where(eq(dailyWeight.userId, userId))
      .orderBy(desc(dailyWeight.fecha))
      .limit(1);

    return {
      currentVersionId: perfil.currentVersionId,
      pesoActualKg: pesoRow ? Number(pesoRow.pesoKg) : Number(perfil.pesoInicialKg),
      alturaCm: Number(perfil.alturaCm),
      edad: perfil.edad,
      sexo: perfil.sexo,
      factorActividad: perfil.factorActividad,
    };
  }

  private normaliseInput(input: DailyEntryInput): Partial<typeof dailyEntry.$inferInsert> {
    const out: Partial<typeof dailyEntry.$inferInsert> = {};
    if (input.pasos !== undefined) out.pasos = input.pasos;
    if (input.pasosCerrados !== undefined) {
      out.pasosCerrados = input.pasosCerrados ? new Date() : null;
    }
    if (input.kcalIn !== undefined) out.kcalIn = input.kcalIn;
    if (input.sodioG !== undefined) {
      out.sodioG = input.sodioG !== null ? input.sodioG.toString() : null;
    }
    if (input.aguaL !== undefined) out.aguaL = input.aguaL.toString();
    if (input.cafeTeL !== undefined) out.cafeTeL = input.cafeTeL.toString();
    if (input.refrescoZeroL !== undefined) out.refrescoZeroL = input.refrescoZeroL.toString();
    if (input.azucaradaL !== undefined) out.azucaradaL = input.azucaradaL.toString();
    if (input.alcoholL !== undefined) out.alcoholL = input.alcoholL.toString();
    if (input.productividad !== undefined) out.productividad = input.productividad;
    return out;
  }

  private async rewriteStepDeficitXp(
    tx: Database,
    userId: string,
    fecha: string,
    entry: typeof dailyEntry.$inferSelect,
    profile: ProfileSnapshot,
  ): Promise<void> {
    // Borrar las filas anteriores de tipo P y C para este día.
    await tx
      .delete(xpLog)
      .where(
        and(
          eq(xpLog.userId, userId),
          eq(xpLog.fecha, fecha),
          eq(xpLog.tipo, 'P'),
        ),
      );
    await tx
      .delete(xpLog)
      .where(
        and(
          eq(xpLog.userId, userId),
          eq(xpLog.fecha, fecha),
          eq(xpLog.tipo, 'C'),
        ),
      );

    // Pasos
    if (entry.pasos !== null && entry.pasos > 0) {
      const xpPasos = calcStepXP(entry.pasos, profile.pesoActualKg);
      if (xpPasos > 0) {
        await tx.insert(xpLog).values({
          userId,
          profileVersionId: profile.currentVersionId,
          fecha,
          tipo: 'P',
          descripcion: `${entry.pasos} pasos × ${profile.pesoActualKg.toFixed(0)} kg`,
          xp: xpPasos,
        });
      }
    }

    // Déficit calórico
    if (entry.kcalIn !== null) {
      const bmr = calcBMR({
        pesoKg: profile.pesoActualKg,
        alturaCm: profile.alturaCm,
        edad: profile.edad,
        sexo: profile.sexo,
      });
      const tdee = calcTDEE(bmr, profile.factorActividad);
      const xpDef = calcDeficitXP(tdee, entry.kcalIn);
      if (xpDef > 0) {
        await tx.insert(xpLog).values({
          userId,
          profileVersionId: profile.currentVersionId,
          fecha,
          tipo: 'C',
          descripcion: `${entry.kcalIn} kcal vs ${Math.round(tdee)} TDEE`,
          xp: xpDef,
        });
      }
    }
  }

  private async rewriteExerciseXp(
    tx: Database,
    userId: string,
    fecha: string,
    profileVersionId: string,
  ): Promise<void> {
    await tx
      .delete(xpLog)
      .where(
        and(
          eq(xpLog.userId, userId),
          eq(xpLog.fecha, fecha),
          eq(xpLog.tipo, 'L'),
        ),
      );

    const ejercicios = await tx
      .select({
        nombre: exerciseLog.nombre,
        minutos: exerciseLog.minutos,
        kcalQuemadas: exerciseLog.kcalQuemadas,
        tipo: exerciseLog.tipo,
      })
      .from(exerciseLog)
      .where(and(eq(exerciseLog.userId, userId), eq(exerciseLog.fecha, fecha)));

    for (const ej of ejercicios) {
      // Caminata no genera xp_log L (los pasos sí cuentan como tipo P).
      if (ej.tipo !== 'ejercicio' || ej.kcalQuemadas === null) continue;
      const xp = calcExerciseXP(ej.kcalQuemadas);
      if (xp <= 0) continue;
      await tx.insert(xpLog).values({
        userId,
        profileVersionId,
        fecha,
        tipo: 'L',
        descripcion: `${ej.nombre}${ej.minutos !== null ? ` ${ej.minutos}min` : ''} · ${ej.kcalQuemadas} kcal → ${xp} XP (×0.7)`,
        xp,
      });
    }
  }

  private async syncHidAttribute(
    tx: Database,
    userId: string,
    fecha: string,
    entry: typeof dailyEntry.$inferSelect,
  ): Promise<boolean> {
    const sodioG = entry.sodioG !== null ? Number(entry.sodioG) : 0;
    const meta = calcHydrationGoal(sodioG);
    const efectivos = calcEffectiveLitros([
      { tipo: 'agua', litros: Number(entry.aguaL) },
      { tipo: 'cafe_te', litros: Number(entry.cafeTeL) },
      { tipo: 'refresco_zero', litros: Number(entry.refrescoZeroL) },
      { tipo: 'azucarada', litros: Number(entry.azucaradaL) },
      { tipo: 'alcohol', litros: Number(entry.alcoholL) },
    ]);
    const cumple = efectivos >= meta;

    const [existing] = await tx
      .select({ id: attributeLog.id })
      .from(attributeLog)
      .where(
        and(
          eq(attributeLog.userId, userId),
          eq(attributeLog.fecha, fecha),
          eq(attributeLog.atributo, 'HID'),
        ),
      )
      .limit(1);

    if (cumple && !existing) {
      await tx.insert(attributeLog).values({
        userId,
        fecha,
        atributo: 'HID',
        delta: 1,
        descripcion: `meta hidratación (${efectivos.toFixed(2)}/${meta.toFixed(2)} L)`,
      });
    } else if (!cumple && existing) {
      // Idempotencia: si en el mismo día deja de cumplir, retiramos.
      await tx.delete(attributeLog).where(eq(attributeLog.id, existing.id));
    }

    return cumple;
  }

  private async syncProAttribute(
    tx: Database,
    userId: string,
    fecha: string,
    productividad: number | null,
  ): Promise<void> {
    // PRO se reescribe entero (idempotente). Si productividad es null o 0,
    // no hay fila — refleja "no declarado" o "terrible".
    await tx
      .delete(attributeLog)
      .where(
        and(
          eq(attributeLog.userId, userId),
          eq(attributeLog.fecha, fecha),
          eq(attributeLog.atributo, 'PRO'),
        ),
      );

    if (productividad !== null && productividad > 0) {
      const labels: Record<number, string> = {
        1: 'flojo',
        2: 'decente',
        3: 'brutal',
      };
      await tx.insert(attributeLog).values({
        userId,
        fecha,
        atributo: 'PRO',
        delta: productividad,
        descripcion: `productividad ${labels[productividad] ?? 'declarada'}`,
      });
    }
  }

  private async hasHidAttribute(userId: string, fecha: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: attributeLog.id })
      .from(attributeLog)
      .where(
        and(
          eq(attributeLog.userId, userId),
          eq(attributeLog.fecha, fecha),
          eq(attributeLog.atributo, 'HID'),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private toDto(
    _userId: string,
    fecha: string,
    row: typeof dailyEntry.$inferSelect | null,
    metaCumplida: boolean,
  ): DailyEntry {
    const aguaL = row ? Number(row.aguaL) : 0;
    const cafeTeL = row ? Number(row.cafeTeL) : 0;
    const refrescoZeroL = row ? Number(row.refrescoZeroL) : 0;
    const azucaradaL = row ? Number(row.azucaradaL) : 0;
    const alcoholL = row ? Number(row.alcoholL) : 0;
    const sodioG = row?.sodioG ? Number(row.sodioG) : null;

    const litrosEfectivos = calcEffectiveLitros([
      { tipo: 'agua', litros: aguaL },
      { tipo: 'cafe_te', litros: cafeTeL },
      { tipo: 'refresco_zero', litros: refrescoZeroL },
      { tipo: 'azucarada', litros: azucaradaL },
      { tipo: 'alcohol', litros: alcoholL },
    ]);
    const metaLitros = calcHydrationGoal(sodioG ?? 0);

    return {
      fecha,
      pasos: row?.pasos ?? null,
      pasosCerrados: row?.pasosCerrados?.toISOString() ?? null,
      kcalIn: row?.kcalIn ?? null,
      sodioG,
      aguaL,
      cafeTeL,
      refrescoZeroL,
      azucaradaL,
      alcoholL,
      productividad: row?.productividad ?? null,
      litrosEfectivos,
      metaLitros,
      metaCumplida,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }
}
