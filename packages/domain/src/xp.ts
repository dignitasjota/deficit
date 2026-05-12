import {
  KCAL_POR_PASO_FACTOR,
  PENALIZACION_EJERCICIO,
  TOPE_PASOS_DIARIO,
} from './constants.js';

/**
 * XP por pasos diarios.
 * Ver docs/DOMAIN.md §5.2.
 *
 *   pasos_computables = min(pasos, 25000)
 *   xp = pasos_computables × peso_kg × 0.00032
 *
 * Resultado redondeado al entero más cercano.
 * El tope diario evita inflar XP por errores del podómetro.
 */
export function calcStepXP(pasos: number, pesoKg: number): number {
  if (pasos < 0) {
    throw new Error(`pasos no puede ser negativo: ${pasos}`);
  }
  if (pesoKg <= 0) {
    throw new Error(`pesoKg debe ser positivo: ${pesoKg}`);
  }

  const pasosComputables = Math.min(pasos, TOPE_PASOS_DIARIO);
  return Math.round(pasosComputables * pesoKg * KCAL_POR_PASO_FACTOR);
}

/**
 * XP por sesión de ejercicio.
 * Ver docs/DOMAIN.md §5.3.
 *
 *   xp = kcal_quemadas × 0.7
 *
 * El factor 0.7 evita doble conteo con el TDEE elevado de los días de
 * ejercicio. Resultado redondeado al entero más cercano.
 */
export function calcExerciseXP(kcalQuemadas: number): number {
  if (kcalQuemadas < 0) {
    throw new Error(`kcalQuemadas no puede ser negativo: ${kcalQuemadas}`);
  }
  return Math.round(kcalQuemadas * PENALIZACION_EJERCICIO);
}

/**
 * XP por déficit calórico.
 * Ver docs/DOMAIN.md §5.1.
 *
 *   xp = max(0, TDEE − kcal_in)
 *
 * El máximo con 0 garantiza que un superávit no genera XP negativa.
 * Si `kcalIn` no se ha registrado para el día, devolver `null` desde
 * el caller en lugar de invocar esta función con 0 — para distinguir
 * "no hay dato" de "hay 0 kcal ingeridas".
 */
export function calcDeficitXP(tdee: number, kcalIn: number): number {
  if (tdee <= 0) {
    throw new Error(`tdee debe ser positivo: ${tdee}`);
  }
  if (kcalIn < 0) {
    throw new Error(`kcalIn no puede ser negativo: ${kcalIn}`);
  }
  return Math.max(0, Math.round(tdee - kcalIn));
}
