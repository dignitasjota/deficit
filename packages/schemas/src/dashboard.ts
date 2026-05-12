import { z } from 'zod';

export const estadoBasculaSchema = z.enum([
  'DENTRO',
  'FUERA_ARRIBA',
  'FUERA_ABAJO',
  'NO_REGISTRADO',
]);
export type EstadoBascula = z.infer<typeof estadoBasculaSchema>;

/**
 * DTO de la retención. Coincide con el tipo `RetentionBreakdown` del
 * package `@perdida-peso/domain` pero re-declarado aquí como Zod schema
 * para validación en frontera. Se sufija `Dto` para evitar colisión de
 * nombres al re-exportar.
 */
export const retentionBreakdownDtoSchema = z.object({
  retSodio: z.number(),
  retGlucogeno: z.number(),
  retDigestivo: z.number(),
  retTotal: z.number(),
});
export type RetentionBreakdownDto = z.infer<typeof retentionBreakdownDtoSchema>;

export const expectedRangeDtoSchema = z.object({
  rangoMin: z.number(),
  rangoMax: z.number(),
  retencion: retentionBreakdownDtoSchema,
  estadoBascula: estadoBasculaSchema,
  /** Diferencia signed entre báscula y media 7d (informativo). null si no hay datos suficientes. */
  baselineDrift: z.number().nullable(),
});
export type ExpectedRangeDto = z.infer<typeof expectedRangeDtoSchema>;

export const dashboardHeaderSchema = z.object({
  /** Peso báscula del día actual. null si aún no se ha registrado. */
  pesoHoy: z.number().nullable(),
  /** Fecha del peso báscula (puede ser hoy, o el último registrado). */
  pesoFecha: z.string().nullable(),
  /** Media móvil de los últimos N pesos (default 7). null si la serie está vacía. */
  media7d: z.number().nullable(),
  /** Peso esperado según xpTotal acumulado. peso_inicial − xpTotal/7700. */
  pesoTeorico: z.number(),
  /** XP total acumulada del usuario. */
  xpTotal: z.number(),
  /** Sodio total registrado para hoy en `daily_entry` (gramos). 0 si no hay. */
  sodioG: z.number(),
  /** Rango esperado y desglose de retención. */
  rangoEsperado: expectedRangeDtoSchema,
});
export type DashboardHeader = z.infer<typeof dashboardHeaderSchema>;
