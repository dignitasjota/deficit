import { z } from 'zod';
import { isoDateSchema } from './common.js';

/**
 * Productividad declarada del día.
 *  0 = terrible, 1 = flojo, 2 = decente, 3 = brutal
 * Ver docs/DOMAIN.md §6.2.
 */
export const productividadSchema = z.number().int().min(0).max(3);
export type Productividad = z.infer<typeof productividadSchema>;

export const exerciseTipoSchema = z.enum(['ejercicio', 'caminata']);
export type ExerciseTipo = z.infer<typeof exerciseTipoSchema>;

/** Entrada vista por la API (GET /v1/entries/:date). Todos los campos opcionales. */
export const dailyEntrySchema = z.object({
  fecha: z.string(),
  pasos: z.number().int().nonnegative().nullable(),
  pasosCerrados: z.string().datetime().nullable(),
  kcalIn: z.number().int().nonnegative().nullable(),
  sodioG: z.number().nonnegative().nullable(),
  aguaL: z.number().nonnegative(),
  cafeTeL: z.number().nonnegative(),
  refrescoZeroL: z.number().nonnegative(),
  azucaradaL: z.number().nonnegative(),
  alcoholL: z.number().nonnegative(),
  productividad: productividadSchema.nullable(),
  /** Litros efectivos calculados aplicando multiplicadores. */
  litrosEfectivos: z.number().nonnegative(),
  /** Meta de hidratación dinámica desde sodio. */
  metaLitros: z.number().nonnegative(),
  /** Si la meta de hidratación ya se cumple → +1 HID otorgado. */
  metaCumplida: z.boolean(),
  updatedAt: z.string().datetime().nullable(),
});
export type DailyEntry = z.infer<typeof dailyEntrySchema>;

export const dailyEntryInputSchema = z.object({
  pasos: z.number().int().nonnegative().max(200_000).optional().nullable(),
  pasosCerrados: z.boolean().optional(),
  kcalIn: z.number().int().nonnegative().max(20_000).optional().nullable(),
  sodioG: z.number().nonnegative().max(50).optional().nullable(),
  aguaL: z.number().nonnegative().max(20).optional(),
  cafeTeL: z.number().nonnegative().max(10).optional(),
  refrescoZeroL: z.number().nonnegative().max(10).optional(),
  azucaradaL: z.number().nonnegative().max(10).optional(),
  alcoholL: z.number().nonnegative().max(10).optional(),
  productividad: productividadSchema.optional().nullable(),
});
export type DailyEntryInput = z.infer<typeof dailyEntryInputSchema>;

export const exerciseLogSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  tipo: exerciseTipoSchema,
  nombre: z.string(),
  minutos: z.number().int().positive().nullable(),
  kcalQuemadas: z.number().int().nonnegative().nullable(),
  /** XP otorgada por esta sesión (snapshot, no se recalcula al cambiar el dominio). */
  xpOtorgada: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;

export const exerciseLogInputSchema = z.object({
  fecha: isoDateSchema,
  tipo: exerciseTipoSchema,
  nombre: z.string().min(1).max(120),
  minutos: z.number().int().positive().max(600).optional().nullable(),
  kcalQuemadas: z.number().int().nonnegative().max(10_000).optional().nullable(),
});
export type ExerciseLogInput = z.infer<typeof exerciseLogInputSchema>;

/** Constantes del dominio expuestas al cliente para cálculo en vivo. */
export const dailyEntryDerivedSchema = z.object({
  /** XP estimada por el peso báscula actual (recalculada en backend). */
  xpPasosEstimada: z.number().int().nonnegative(),
  xpDeficitEstimada: z.number().int().nonnegative(),
});
export type DailyEntryDerived = z.infer<typeof dailyEntryDerivedSchema>;
