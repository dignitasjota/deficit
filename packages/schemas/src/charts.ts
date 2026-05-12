import { z } from 'zod';

export const weightChartRangeSchema = z.enum(['7d', '30d', '90d', 'all']);
export type WeightChartRange = z.infer<typeof weightChartRangeSchema>;

/**
 * Punto individual de la serie de evolución del peso.
 * - peso_real: del daily_weight si existe, null si no.
 * - media_7d: media móvil de los 7 últimos pesos no-null hasta esa fecha
 *   (incluida).
 * - peso_teorico: peso_inicial − xpTotal_acumulado_a_fecha / 7700.
 * - rango_min / rango_max: peso_teorico + ret_total × {0.5, 1.2}.
 */
export const weightChartPointSchema = z.object({
  fecha: z.string(),
  pesoReal: z.number().nullable(),
  media7d: z.number().nullable(),
  pesoTeorico: z.number(),
  rangoMin: z.number(),
  rangoMax: z.number(),
});
export type WeightChartPoint = z.infer<typeof weightChartPointSchema>;

export const weightChartResponseSchema = z.object({
  range: weightChartRangeSchema,
  /** Serie cronológica ascendente (más antiguo primero). */
  puntos: z.array(weightChartPointSchema),
  /** Estadísticos agregados sobre los `pesoReal` no-null del rango. */
  stats: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    /** Diferencia peso_real_último − peso_real_primero. */
    delta: z.number().nullable(),
  }),
});
export type WeightChartResponse = z.infer<typeof weightChartResponseSchema>;
