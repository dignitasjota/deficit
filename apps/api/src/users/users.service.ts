import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { deriveProgressionParams } from '@perdida-peso/domain';
import { HITOS_POR_DEFECTO } from '@perdida-peso/domain';
import type { UserProfile, UserProfileInput } from '@perdida-peso/schemas';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { milestones } from '../db/schema/milestones.js';
import { profileVersion, userProfile } from '../db/schema/user_profile.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    const [row] = await this.db
      .select({
        userId: userProfile.userId,
        currentVersionId: userProfile.currentVersionId,
        fechaInicio: userProfile.fechaInicio,
        updatedAt: userProfile.updatedAt,
        pesoInicialKg: profileVersion.pesoInicialKg,
        pesoObjetivoKg: profileVersion.pesoObjetivoKg,
        alturaCm: profileVersion.alturaCm,
        edad: profileVersion.edad,
        sexo: profileVersion.sexo,
        factorActividad: profileVersion.factorActividad,
        kgPorNivel: profileVersion.kgPorNivel,
        xpPorNivel: profileVersion.xpPorNivel,
        nivelesPorSemana: profileVersion.nivelesPorSemana,
      })
      .from(userProfile)
      .innerJoin(profileVersion, eq(profileVersion.id, userProfile.currentVersionId))
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (!row) return null;

    const pesoInicialKg = Number(row.pesoInicialKg);
    const pesoObjetivoKg = Number(row.pesoObjetivoKg);

    return {
      userId: row.userId,
      pesoInicialKg,
      pesoObjetivoKg,
      alturaCm: Number(row.alturaCm),
      edad: row.edad,
      sexo: row.sexo,
      factorActividad: row.factorActividad,
      fechaInicio: row.fechaInicio,
      kgPorNivel: Number(row.kgPorNivel),
      xpPorNivel: Number(row.xpPorNivel),
      nivelesPorSemana: Number(row.nivelesPorSemana),
      semanasA_L80: pesoInicialKg - pesoObjetivoKg,
      currentVersionId: row.currentVersionId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsertProfile(userId: string, input: UserProfileInput): Promise<UserProfile> {
    const derived = deriveProgressionParams({
      pesoInicialKg: input.pesoInicialKg,
      pesoObjetivoKg: input.pesoObjetivoKg,
    });

    return this.db.transaction(async (tx) => {
      // Cerrar versión vigente si existe.
      const [current] = await tx
        .select({ id: userProfile.userId, currentVersionId: userProfile.currentVersionId })
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1);

      if (current) {
        await tx
          .update(profileVersion)
          .set({ validTo: new Date() })
          .where(
            and(
              eq(profileVersion.id, current.currentVersionId),
              isNull(profileVersion.validTo),
            ),
          );
      }

      // Insertar nueva versión.
      const [version] = await tx
        .insert(profileVersion)
        .values({
          userId,
          pesoInicialKg: input.pesoInicialKg.toString(),
          pesoObjetivoKg: input.pesoObjetivoKg.toString(),
          alturaCm: input.alturaCm.toString(),
          edad: input.edad,
          sexo: input.sexo,
          factorActividad: input.factorActividad,
          kgPorNivel: derived.kgPorNivel.toString(),
          xpPorNivel: derived.xpPorNivel.toString(),
          nivelesPorSemana: derived.nivelesPorSemana.toString(),
          motivoCambio: input.motivoCambio ?? null,
        })
        .returning({ id: profileVersion.id });

      if (!version) {
        throw new Error('No se pudo crear la profile_version');
      }

      // Upsert user_profile apuntando a la nueva versión.
      if (current) {
        await tx
          .update(userProfile)
          .set({
            currentVersionId: version.id,
            fechaInicio: input.fechaInicio,
            updatedAt: new Date(),
          })
          .where(eq(userProfile.userId, userId));
      } else {
        await tx.insert(userProfile).values({
          userId,
          currentVersionId: version.id,
          fechaInicio: input.fechaInicio,
        });
        // Sembrar hitos por defecto solo en el primer alta.
        await tx
          .insert(milestones)
          .values(
            HITOS_POR_DEFECTO.map((h) => ({
              userId,
              nivel: h.nivel,
              nombre: h.nombre,
              color: h.color ?? null,
            })),
          )
          .onConflictDoNothing();
      }

      return undefined as never;
    }).then(async () => {
      const profile = await this.getProfile(userId);
      if (!profile) throw new NotFoundException('Perfil no encontrado tras upsert');
      return profile;
    });
  }
}
