import { z } from 'zod';
import { factorActividadSchema, sexoSchema } from './common.js';

export const userProfileInputSchema = z
  .object({
    pesoInicialKg: z.number().positive().min(30).max(400),
    pesoObjetivoKg: z.number().positive().min(30).max(400),
    alturaCm: z.number().positive().min(100).max(250),
    edad: z.number().int().min(10).max(120),
    sexo: sexoSchema,
    factorActividad: factorActividadSchema,
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
    motivoCambio: z.string().max(500).optional(),
  })
  .refine((v) => v.pesoObjetivoKg < v.pesoInicialKg, {
    message: 'pesoObjetivoKg debe ser menor que pesoInicialKg',
    path: ['pesoObjetivoKg'],
  });

export type UserProfileInput = z.infer<typeof userProfileInputSchema>;

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  pesoInicialKg: z.number(),
  pesoObjetivoKg: z.number(),
  alturaCm: z.number(),
  edad: z.number(),
  sexo: sexoSchema,
  factorActividad: factorActividadSchema,
  fechaInicio: z.string(),
  /** Derivados calculados por el backend desde packages/domain. */
  kgPorNivel: z.number(),
  xpPorNivel: z.number(),
  nivelesPorSemana: z.number(),
  semanasA_L80: z.number(),
  /** ID de la versión vigente. Versiones nuevas al editar peso o factor. */
  currentVersionId: z.string().uuid(),
  updatedAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
