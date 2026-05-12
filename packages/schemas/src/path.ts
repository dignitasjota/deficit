import { z } from 'zod';

export const levelOriginSchema = z.enum(['NATURAL', 'COMPRADA']);
export type LevelOrigin = z.infer<typeof levelOriginSchema>;

export const reachedLevelSchema = z.object({
  nivel: z.number().int().min(1).max(80),
  origin: levelOriginSchema,
  /** Fecha de adquisición. Para NATURAL, fecha del xp_log que provocó el cruce. Para COMPRADA, comprada_at. */
  fecha: z.string().datetime(),
});
export type ReachedLevel = z.infer<typeof reachedLevelSchema>;

export const upcomingLevelSchema = z.object({
  nivel: z.number().int().min(1).max(80),
  fechaEstimada: z.string().datetime(),
});
export type UpcomingLevel = z.infer<typeof upcomingLevelSchema>;

export const pathDestinationSchema = z.object({
  /** Nivel actual del usuario (naturales + comprados, capped en 80). */
  nivelActual: z.number().int().min(0).max(80),
  /** Naturales calculados desde xpTotal. */
  nivelesNaturales: z.number().int().min(0).max(80),
  /** Compras de level_purchases. */
  nivelesComprados: z.number().int().nonnegative(),
  /** Constante 80 (jefe final). */
  destino: z.literal(80),
  /** 80 − nivelActual. */
  nivelesRestantes: z.number().int().min(0).max(80),
  /** % camino recorrido (nivelActual/80, 0..1). */
  pctCamino: z.number().min(0).max(1),
  /** Fecha estimada de llegada al jefe final. */
  llegadaEstimada: z.string().datetime(),
  /** Semanas restantes según ritmo objetivo (7700 XP/sem) y colchón disponible. */
  semanasRestantes: z.number().int().nonnegative(),
  /** Colchón disponible AHORA (descontadas compras previas). */
  colchonDisponible: z.number().int().nonnegative(),
  /** Coste para comprar 1 nivel (= xpPorNivel del usuario, redondeado). */
  costePorCompra: z.number().int().positive(),
  /** ¿Se puede comprar al menos un nivel ahora mismo? */
  puedeComprar: z.boolean(),
  /** Lista de niveles ya conseguidos (orden DESC: el más reciente primero). */
  conseguidos: z.array(reachedLevelSchema),
  /** Lista de niveles por venir con fecha estimada (orden ASC). */
  porVenir: z.array(upcomingLevelSchema),
});
export type PathDestination = z.infer<typeof pathDestinationSchema>;

export const buyLevelInputSchema = z.object({
  confirmar: z.literal(true),
});
export type BuyLevelInput = z.infer<typeof buyLevelInputSchema>;
