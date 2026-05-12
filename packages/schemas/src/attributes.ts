import { z } from 'zod';
import { atributoCodigoSchema, isoDateSchema } from './common.js';

/**
 * Modo de cómputo del atributo:
 *  - MANUAL: el usuario lo incrementa con un botón +1.
 *  - AUTO_HIDRATACION: HID. Lo gestiona EntriesService al cumplir meta.
 *  - AUTO_PRODUCTIVIDAD: PRO. Modal con 4 niveles 0..3 actualiza daily_entry.
 */
export const attributeModoSchema = z.enum([
  'MANUAL',
  'AUTO_HIDRATACION',
  'AUTO_PRODUCTIVIDAD',
]);
export type AttributeModo = z.infer<typeof attributeModoSchema>;

export const attributeStatusSchema = z.object({
  code: atributoCodigoSchema,
  /** Nombre largo, ej. "Fuerza". */
  nombre: z.string(),
  /** Color sugerido para barras y radar (variable CSS). */
  color: z.string(),
  /** Valor total acumulado (SUM(delta) de attribute_log). */
  valor: z.number().int().nonnegative(),
  modo: attributeModoSchema,
  /** ¿Se ha registrado +1 (o el valor PRO) hoy? */
  alcanzadoHoy: z.boolean(),
  /** Para PRO: valor declarado hoy (0..3) o null. */
  productividadHoy: z.number().int().min(0).max(3).nullable(),
});
export type AttributeStatus = z.infer<typeof attributeStatusSchema>;

export const attributesSummarySchema = z.object({
  atributos: z.array(attributeStatusSchema),
  /** Suma total de los 9 atributos. */
  total: z.number().int().nonnegative(),
});
export type AttributesSummary = z.infer<typeof attributesSummarySchema>;

export const incrementAttributeInputSchema = z.object({
  fecha: isoDateSchema,
  descripcion: z.string().min(1).max(200).optional(),
  /** Solo PRO acepta value (0..3). El resto lo ignora. */
  value: z.number().int().min(0).max(3).optional(),
});
export type IncrementAttributeInput = z.infer<typeof incrementAttributeInputSchema>;
