import { z } from 'zod';

export const xpTipoSchema = z.enum(['P', 'C', 'L', 'H', 'A', 'M']);
export type XpTipo = z.infer<typeof xpTipoSchema>;

/** Hito (alineado con `Milestone` del package domain). */
export const milestoneDtoSchema = z.object({
  nivel: z.number().int().min(0).max(80),
  nombre: z.string(),
  color: z.string().nullable(),
  alcanzado: z.boolean(),
  alcanzadoAt: z.string().datetime().nullable(),
});
export type MilestoneDto = z.infer<typeof milestoneDtoSchema>;

export const xpSummarySchema = z.object({
  /** XP acumulada total. */
  xpTotal: z.number().int().nonnegative(),
  /** Nivel actual (0..80). */
  nivelActual: z.number().int().min(0).max(80),
  /** XP dentro del nivel actual. */
  xpEnNivel: z.number().nonnegative(),
  /** XP que falta para llegar al siguiente nivel. */
  xpFalta: z.number().nonnegative(),
  /** Progreso dentro del nivel (0..1). */
  progresoPct: z.number().min(0).max(1),
  /** Coste por nivel del usuario (derivado del perfil). */
  xpPorNivel: z.number().positive(),
  /** Niveles por semana esperados al ritmo objetivo (7700 XP/sem). */
  nivelesPorSemana: z.number().positive(),
  /** ¿Ha llegado a L80 con todos los hitos cumplidos? */
  jefeFinalSuperado: z.boolean(),

  /** Lista completa de hitos del usuario (ordenados ascendentemente). */
  hitos: z.array(milestoneDtoSchema),
  /** Próximo hito por alcanzar. null si todos están alcanzados. */
  proximoHito: milestoneDtoSchema.nullable(),
  /** XP que falta hasta el próximo hito (incluye los niveles entre medias). */
  xpFaltaHito: z.number().nonnegative(),

  /** XP estimado generado por día al ritmo actual (semanal/7). Para el "~Xd". */
  xpDiaEstimado: z.number().nonnegative(),

  /** Stats agregados (XP de la última semana, BMR, racha). */
  stats: z.object({
    xpHoy: z.number().int().nonnegative(),
    xpMediaDia: z.number().nonnegative(),
    xpSemanaActual: z.number().int().nonnegative(),
    bmr: z.number().nonnegative(),
    rachaDias: z.number().int().nonnegative(),
    colchon: z.number().int().nonnegative(),
  }),
});
export type XpSummary = z.infer<typeof xpSummarySchema>;

export const manualXpInputSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  xp: z.number().int().nonnegative().refine((v) => v !== 0, 'xp no puede ser 0'),
  descripcion: z.string().min(1).max(500),
});
export type ManualXpInput = z.infer<typeof manualXpInputSchema>;

export const xpLogEntrySchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  tipo: xpTipoSchema,
  descripcion: z.string(),
  xp: z.number().int(),
  createdAt: z.string().datetime(),
});
export type XpLogEntry = z.infer<typeof xpLogEntrySchema>;
