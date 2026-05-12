import {
  KCAL_POR_KG_GRASA,
  RANGO_MAX_RATIO,
  RANGO_MIN_RATIO,
  RETENCION_DIGESTIVO_KG,
  RETENCION_GLUCOGENO_KG,
  RETENCION_SODIO_FACTOR,
  SODIO_BASE_G,
} from './constants.js';
import type { ExpectedRange, RetentionBreakdown } from './types.js';

/**
 * Modelo de retención de agua y bolo digestivo.
 * Ver docs/DOMAIN.md §8.1 y §8.2.
 *
 *   ret_sodio     = 0.4 × max(0, sodio_g − 2.0)
 *   ret_glucogeno = 1.0   (constante; asume modo déficit/low-carb)
 *   ret_digestivo = 0.3   (constante)
 *   ret_total     = sodio + glucogeno + digestivo
 *
 * Solo el sodio es input del usuario; los otros dos son constantes.
 */
export function calcRetention(sodioG: number): RetentionBreakdown {
  if (sodioG < 0) {
    throw new Error(`sodioG no puede ser negativo: ${sodioG}`);
  }

  const retSodio = RETENCION_SODIO_FACTOR * Math.max(0, sodioG - SODIO_BASE_G);
  const retGlucogeno = RETENCION_GLUCOGENO_KG;
  const retDigestivo = RETENCION_DIGESTIVO_KG;
  const retTotal = retSodio + retGlucogeno + retDigestivo;

  return { retSodio, retGlucogeno, retDigestivo, retTotal };
}

/**
 * Peso teórico esperado hoy: la pérdida real si toda la XP de déficit
 * hubiera sido grasa pura. Ver docs/DOMAIN.md §9.1.
 *
 *   peso_teorico = peso_inicial − (xpTotal / 7700)
 *
 * IMPORTANTE: siempre se divide por 7700 (kcal por kg de grasa),
 * independientemente del `xpPorNivel` del usuario. Lo que escala con
 * el objetivo es cuántos niveles representa esa pérdida, no la pérdida
 * física en sí.
 */
export function calcTheoreticalWeight(pesoInicialKg: number, xpTotal: number): number {
  if (pesoInicialKg <= 0) {
    throw new Error(`pesoInicialKg debe ser positivo: ${pesoInicialKg}`);
  }
  if (xpTotal < 0) {
    throw new Error(`xpTotal no puede ser negativo: ${xpTotal}`);
  }
  return pesoInicialKg - xpTotal / KCAL_POR_KG_GRASA;
}

/**
 * Rango esperado de peso báscula hoy.
 * Ver docs/DOMAIN.md §8.3.
 *
 *   rango_min = peso_teorico + ret_total × 0.5
 *   rango_max = peso_teorico + ret_total × 1.2
 */
export function calcExpectedRange(
  pesoInicialKg: number,
  xpTotal: number,
  sodioG: number,
): ExpectedRange {
  const pesoTeorico = calcTheoreticalWeight(pesoInicialKg, xpTotal);
  const retencion = calcRetention(sodioG);

  return {
    pesoTeorico,
    retencion,
    rangoMin: pesoTeorico + retencion.retTotal * RANGO_MIN_RATIO,
    rangoMax: pesoTeorico + retencion.retTotal * RANGO_MAX_RATIO,
  };
}

export type EstadoRangoBascula = 'DENTRO' | 'FUERA_ARRIBA' | 'FUERA_ABAJO';

export function evaluarPesoEnRango(
  pesoBasculaKg: number,
  range: Pick<ExpectedRange, 'rangoMin' | 'rangoMax'>,
): EstadoRangoBascula {
  if (pesoBasculaKg < range.rangoMin) return 'FUERA_ABAJO';
  if (pesoBasculaKg > range.rangoMax) return 'FUERA_ARRIBA';
  return 'DENTRO';
}

/**
 * Media móvil de los últimos N pesos disponibles. Ver §9.2.
 * Si la serie tiene menos de N entradas, se promedian las disponibles.
 * Devuelve `null` si la serie está vacía.
 */
export function calcMovingAverage(pesos: ReadonlyArray<number>, n = 7): number | null {
  if (n <= 0) {
    throw new Error(`n debe ser positivo: ${n}`);
  }
  if (pesos.length === 0) return null;

  const slice = pesos.slice(-n);
  const sum = slice.reduce((acc, p) => acc + p, 0);
  return sum / slice.length;
}

/**
 * Drift baseline: diferencia signed entre el peso báscula del día y la
 * media móvil de 7 días. Solo informativo, NO se suma a `ret_total`.
 * Ver §8.4.
 */
export function calcBaselineDrift(
  pesoBasculaKg: number,
  pesos: ReadonlyArray<number>,
): number | null {
  const media = calcMovingAverage(pesos, 7);
  if (media === null) return null;
  return pesoBasculaKg - media;
}
