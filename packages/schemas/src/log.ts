import { z } from 'zod';
import { atributoCodigoSchema } from './common.js';
import { xpTipoSchema } from './xp.js';

/**
 * Página de bitácora (xp_log). Cursor opaco base64url codificando
 * `{ createdAt, id }`. Si `nextCursor` es null, no hay más páginas.
 */
export const xpLogEntryDtoSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  tipo: xpTipoSchema,
  descripcion: z.string(),
  xp: z.number().int(),
  createdAt: z.string().datetime(),
});
export type XpLogEntryDto = z.infer<typeof xpLogEntryDtoSchema>;

export const xpLogPageSchema = z.object({
  entries: z.array(xpLogEntryDtoSchema),
  nextCursor: z.string().nullable(),
  /** Total de entradas del usuario (para mostrar "BITÁCORA [N]"). */
  total: z.number().int().nonnegative(),
});
export type XpLogPage = z.infer<typeof xpLogPageSchema>;

/**
 * Página de registro de atributos.
 */
export const attributeLogEntryDtoSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  atributo: atributoCodigoSchema,
  delta: z.number().int(),
  descripcion: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AttributeLogEntryDto = z.infer<typeof attributeLogEntryDtoSchema>;

export const attributeLogPageSchema = z.object({
  entries: z.array(attributeLogEntryDtoSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
  /** Filtro aplicado o null si TODO. */
  filter: atributoCodigoSchema.nullable(),
});
export type AttributeLogPage = z.infer<typeof attributeLogPageSchema>;

export const logPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type LogPageQuery = z.infer<typeof logPageQuerySchema>;

export const attributeLogQuerySchema = logPageQuerySchema.extend({
  atributo: atributoCodigoSchema.optional(),
});
export type AttributeLogQuery = z.infer<typeof attributeLogQuerySchema>;
