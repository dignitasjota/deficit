import { NIVEL_DESTINO, XP_SEMANAL_META } from './constants.js';
import type { ForecastDestination, LevelForecast } from './types.js';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_POR_SEMANA = 7;

function addWeeks(base: Date, semanas: number): Date {
  return new Date(base.getTime() + semanas * DIAS_POR_SEMANA * MS_POR_DIA);
}

export interface ForecastDestinationInput {
  nivelActual: number;
  xpEnNivel: number;
  xpPorNivel: number;
  colchonDisponible: number;
  hoy: Date;
}

/**
 * Pronóstico de fecha estimada de llegada a L80, considerando el colchón
 * acumulado y un ritmo semanal fijo de 7700 XP. Ver docs/DOMAIN.md §4.3.
 *
 *   xp_falta_L80   = (80 − nivel_actual) × xp_por_nivel − xp_en_nivel
 *   xp_a_generar   = max(0, xp_falta_L80 − colchon_disponible)
 *   semanas        = ceil(xp_a_generar / 7700)
 *   fecha_estimada = hoy + semanas × 7 días
 *
 * Si ya estás en L80, devuelve `semanasRestantes = 0` y la fecha de hoy.
 */
export function forecastDestination(input: ForecastDestinationInput): ForecastDestination {
  const { nivelActual, xpEnNivel, xpPorNivel, colchonDisponible, hoy } = input;

  if (nivelActual < 0 || nivelActual > NIVEL_DESTINO) {
    throw new Error(`nivelActual fuera de rango [0, ${NIVEL_DESTINO}]: ${nivelActual}`);
  }
  if (xpEnNivel < 0) throw new Error(`xpEnNivel no puede ser negativo: ${xpEnNivel}`);
  if (xpPorNivel <= 0) throw new Error(`xpPorNivel debe ser positivo: ${xpPorNivel}`);
  if (xpEnNivel > xpPorNivel) {
    throw new Error(`xpEnNivel (${xpEnNivel}) no puede exceder xpPorNivel (${xpPorNivel})`);
  }
  if (colchonDisponible < 0) {
    throw new Error(`colchonDisponible no puede ser negativo: ${colchonDisponible}`);
  }

  const xpFaltanteParaL80 = (NIVEL_DESTINO - nivelActual) * xpPorNivel - xpEnNivel;

  if (xpFaltanteParaL80 <= 0) {
    return {
      semanasRestantes: 0,
      fechaEstimada: new Date(hoy.getTime()),
      xpFaltanteParaL80: 0,
      colchonAplicable: 0,
      xpQueDebeGenerar: 0,
    };
  }

  const colchonAplicable = Math.min(colchonDisponible, xpFaltanteParaL80);
  const xpQueDebeGenerar = xpFaltanteParaL80 - colchonAplicable;
  const semanasRestantes = Math.ceil(xpQueDebeGenerar / XP_SEMANAL_META);

  return {
    semanasRestantes,
    fechaEstimada: addWeeks(hoy, semanasRestantes),
    xpFaltanteParaL80,
    colchonAplicable,
    xpQueDebeGenerar,
  };
}

export interface ForecastLevelDatesInput {
  nivelActual: number;
  nivelesPorSemana: number;
  hoy: Date;
  /** Por defecto pronostica hasta L80 (nivel destino). */
  hastaNivel?: number;
}

/**
 * Fechas estimadas para cada nivel futuro, asumiendo ritmo constante de
 * `nivelesPorSemana`. Ver docs/DOMAIN.md §11.3.
 *
 *   semanas_hasta_L = (L − nivel_actual) / niveles_por_semana
 *   fecha_L         = hoy + semanas × 7 días
 *
 * Devuelve un array de un elemento por nivel desde `nivelActual + 1`
 * hasta `hastaNivel` (incluido). Si `nivelActual ≥ hastaNivel`, array
 * vacío.
 */
export function forecastLevelDates(input: ForecastLevelDatesInput): LevelForecast[] {
  const { nivelActual, nivelesPorSemana, hoy, hastaNivel = NIVEL_DESTINO } = input;

  if (nivelActual < 0 || nivelActual > NIVEL_DESTINO) {
    throw new Error(`nivelActual fuera de rango [0, ${NIVEL_DESTINO}]: ${nivelActual}`);
  }
  if (nivelesPorSemana <= 0) {
    throw new Error(`nivelesPorSemana debe ser positivo: ${nivelesPorSemana}`);
  }
  if (hastaNivel > NIVEL_DESTINO) {
    throw new Error(`hastaNivel no puede exceder ${NIVEL_DESTINO}: ${hastaNivel}`);
  }

  const out: LevelForecast[] = [];
  for (let nivel = nivelActual + 1; nivel <= hastaNivel; nivel++) {
    const semanas = (nivel - nivelActual) / nivelesPorSemana;
    out.push({
      nivel,
      fechaEstimada: addWeeks(hoy, semanas),
    });
  }
  return out;
}
