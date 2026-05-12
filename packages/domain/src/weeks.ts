import { XP_SEMANAL_META } from './constants.js';
import type { WeekResult } from './types.js';

export interface CalcWeekStatusInput {
  /** XP acumulada en la semana. */
  xpSemana: number;
  /** Colchón disponible al cierre de la semana. */
  colchonDisponible: number;
  /** Si la semana está en curso (no se ha cerrado todavía). */
  enCurso?: boolean;
  /**
   * Si el usuario decidió invertir colchón en esta semana cuando hubo
   * déficit. Solo aplica si `enCurso === false` y `xpSemana < 7700`.
   */
  invertirColchon?: boolean;
}

/**
 * Calcula el estado semanal y el efecto sobre el colchón.
 * Ver docs/DOMAIN.md §10.2 y §10.3.
 *
 * Reglas:
 * - Semana en curso → estado EN_CURSO, no toca el colchón.
 * - xp_semana ≥ 7700 → estado MAS_XP, excedente al colchón.
 * - xp_semana < 7700 con inversión y colchón suficiente → COMPENSADA.
 * - xp_semana < 7700 sin inversión (o colchón insuficiente) → DEFICIT.
 */
export function calcWeekStatus(input: CalcWeekStatusInput): WeekResult {
  const { xpSemana, colchonDisponible, enCurso = false, invertirColchon = false } = input;

  if (xpSemana < 0) {
    throw new Error(`xpSemana no puede ser negativo: ${xpSemana}`);
  }
  if (colchonDisponible < 0) {
    throw new Error(`colchonDisponible no puede ser negativo: ${colchonDisponible}`);
  }

  if (enCurso) {
    return {
      estado: 'EN_CURSO',
      xpTotal: xpSemana,
      excedente: 0,
      colchonRecibido: 0,
      colchonInvertido: 0,
      colchonResultante: colchonDisponible,
    };
  }

  if (xpSemana >= XP_SEMANAL_META) {
    const excedente = xpSemana - XP_SEMANAL_META;
    return {
      estado: 'MAS_XP',
      xpTotal: xpSemana,
      excedente,
      colchonRecibido: excedente,
      colchonInvertido: 0,
      colchonResultante: colchonDisponible + excedente,
    };
  }

  // Déficit semanal
  const falta = XP_SEMANAL_META - xpSemana;

  if (invertirColchon && colchonDisponible >= falta) {
    return {
      estado: 'COMPENSADA',
      xpTotal: xpSemana,
      excedente: 0,
      colchonRecibido: 0,
      colchonInvertido: falta,
      colchonResultante: colchonDisponible - falta,
    };
  }

  return {
    estado: 'DEFICIT',
    xpTotal: xpSemana,
    excedente: 0,
    colchonRecibido: 0,
    colchonInvertido: 0,
    colchonResultante: colchonDisponible,
  };
}

/**
 * Aplica el colchón a una semana en déficit ya cerrada.
 * Devuelve el resultado con el nuevo balance, o `null` si el colchón es
 * insuficiente.
 */
export function applyColchonToWeek(
  xpSemana: number,
  colchonDisponible: number,
): WeekResult | null {
  if (xpSemana >= XP_SEMANAL_META) {
    throw new Error('La semana ya está cumplida; no procede aplicar colchón');
  }
  const falta = XP_SEMANAL_META - xpSemana;
  if (colchonDisponible < falta) return null;

  return calcWeekStatus({
    xpSemana,
    colchonDisponible,
    enCurso: false,
    invertirColchon: true,
  });
}
