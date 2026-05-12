import {
  LITROS_BASE,
  LITROS_POR_G_SODIO_EXTRA,
  MULTIPLICADOR_BEBIDA,
  SODIO_BASE_G,
} from './constants.js';
import type { BebidaConsumida, BebidaTipo } from './types.js';

/**
 * Meta diaria de hidratación en litros, dinámica según el sodio
 * consumido. Ver docs/DOMAIN.md §7.1.
 *
 *   meta = 2.0 + 0.25 × max(0, sodio_g − 2.0)
 *
 * Base 2 L. Cada g de sodio por encima de 2 g añade 0.25 L al objetivo.
 */
export function calcHydrationGoal(sodioG: number): number {
  if (sodioG < 0) {
    throw new Error(`sodioG no puede ser negativo: ${sodioG}`);
  }

  const sodioExtra = Math.max(0, sodioG - SODIO_BASE_G);
  return LITROS_BASE + LITROS_POR_G_SODIO_EXTRA * sodioExtra;
}

/**
 * Litros efectivos de hidratación, ponderando por tipo de bebida.
 * Ver docs/DOMAIN.md §7.2.
 *
 * Multiplicadores (constants.ts):
 *   agua            1.0
 *   cafe_te         0.9
 *   refresco_zero   0.7
 *   azucarada       0
 *   alcohol         0
 */
export function calcEffectiveLitros(bebidas: ReadonlyArray<BebidaConsumida>): number {
  let total = 0;
  for (const { tipo, litros } of bebidas) {
    if (litros < 0) {
      throw new Error(`litros no puede ser negativo: ${litros} (tipo: ${tipo})`);
    }
    total += litros * MULTIPLICADOR_BEBIDA[tipo];
  }
  return total;
}

/**
 * Detalle del consumo agrupado por tipo, útil para la UI (cards
 * "Agua 100%", "Refresco Zero 70%", etc.).
 */
export function aggregateByTipo(
  bebidas: ReadonlyArray<BebidaConsumida>,
): Record<BebidaTipo, number> {
  const acc: Record<BebidaTipo, number> = {
    agua: 0,
    cafe_te: 0,
    refresco_zero: 0,
    azucarada: 0,
    alcohol: 0,
  };
  for (const { tipo, litros } of bebidas) {
    acc[tipo] += litros;
  }
  return acc;
}

/**
 * `true` si los litros efectivos cumplen la meta dinámica.
 * Cumplir la meta da +1 al atributo HID (en modo AUTO), no XP.
 */
export function metaHidratacionCumplida(
  bebidas: ReadonlyArray<BebidaConsumida>,
  sodioG: number,
): boolean {
  return calcEffectiveLitros(bebidas) >= calcHydrationGoal(sodioG);
}
