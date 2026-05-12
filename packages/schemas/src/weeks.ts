import { z } from 'zod';

export const estadoSemanaSchema = z.enum([
  'EN_CURSO',
  'COMPENSADA',
  'MAS_XP',
  'DEFICIT',
]);
export type EstadoSemanaWire = z.infer<typeof estadoSemanaSchema>;

export const weekStatusSchema = z.object({
  /** UUID de la fila weeks. null si la semana aún no está materializada
   *  (típicamente la semana en curso). */
  id: z.string().uuid().nullable(),
  /** Lunes de la semana (YYYY-MM-DD). */
  inicio: z.string(),
  /** Domingo de la semana (YYYY-MM-DD). */
  fin: z.string(),
  xpTotal: z.number().int().nonnegative(),
  estado: estadoSemanaSchema,
  colchonRecibido: z.number().int().nonnegative(),
  colchonInvertido: z.number().int().nonnegative(),
  /** Si está cerrada, timestamp ISO. null si aún en curso. */
  cerradaAt: z.string().datetime().nullable(),
  /** Helpers de UI: porcentaje sobre 7700 (clamp 0..1) y excedente. */
  pctPropio: z.number().min(0).max(1),
  pctColchon: z.number().min(0).max(1),
  excedente: z.number().int().nonnegative(),
  /** ¿Hay colchón suficiente para invertir y compensar? Solo aplica
   *  si estado === 'DEFICIT'. */
  puedeInvertirColchon: z.boolean(),
});
export type WeekStatus = z.infer<typeof weekStatusSchema>;

export const weeksSummarySchema = z.object({
  /** Lista cronológica DESCENDENTE (más reciente primero). */
  semanas: z.array(weekStatusSchema),
  /** Colchón disponible (recibido − invertido). */
  colchonTotal: z.number().int().nonnegative(),
  /** Cuántas semanas terminadas cumplieron (estado MAS_XP o COMPENSADA). */
  semanasOk: z.number().int().nonnegative(),
  /** Cuántas semanas terminadas (denominador para "X/Y OK"). */
  semanasTotales: z.number().int().nonnegative(),
});
export type WeeksSummary = z.infer<typeof weeksSummarySchema>;

export const applyColchonInputSchema = z.object({
  /** Solo para defensa contra clicks repetidos: el cliente confirma el
   *  weekId que verá deficit. */
  confirmar: z.literal(true),
});
export type ApplyColchonInput = z.infer<typeof applyColchonInputSchema>;
