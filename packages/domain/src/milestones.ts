import { NIVEL_DESTINO } from './constants.js';
import type { Milestone, MilestoneState } from './types.js';

/**
 * Lista de hitos por defecto que se siembra al crear un usuario nuevo.
 * Ver docs/DOMAIN.md §12.1.
 */
export const HITOS_POR_DEFECTO: ReadonlyArray<Milestone> = [
  { nivel: 5, nombre: 'Primer impulso', color: 'verde-claro' },
  { nivel: 10, nombre: 'Diez derribados', color: 'verde' },
  { nivel: 20, nombre: 'Cuarto del camino', color: 'amarillo' },
  { nivel: 30, nombre: 'Mitad de mitad', color: 'naranja' },
  { nivel: 40, nombre: 'Mitad del camino', color: 'rojo' },
  { nivel: 50, nombre: 'Cuesta abajo', color: 'morado-claro' },
  { nivel: 60, nombre: 'Tres cuartos', color: 'azul' },
  { nivel: 70, nombre: 'A la vista', color: 'cian' },
  { nivel: 80, nombre: 'Jefe Final', color: 'morado' },
];

export interface CalcMilestoneStateInput {
  nivelActual: number;
  xpEnNivel: number;
  xpPorNivel: number;
  hitos?: ReadonlyArray<Milestone>;
}

/**
 * Calcula el siguiente hito y la XP que falta para alcanzarlo.
 * Ver docs/DOMAIN.md §12.2.
 *
 *   sig_hito       = primer hito con nivel > nivel_actual
 *   xp_falta_hito  = (sig_hito.nivel − nivel_actual) × xp_por_nivel − xp_en_nivel
 *
 * Si el usuario ya está en L80 con todos los hitos cumplidos, devuelve
 * `proximo: null` y `jefeFinalSuperado: true`.
 */
export function calcMilestoneState(input: CalcMilestoneStateInput): MilestoneState {
  const { nivelActual, xpEnNivel, xpPorNivel, hitos = HITOS_POR_DEFECTO } = input;

  if (nivelActual < 0 || nivelActual > NIVEL_DESTINO) {
    throw new Error(`nivelActual fuera de rango [0, ${NIVEL_DESTINO}]: ${nivelActual}`);
  }
  if (xpEnNivel < 0) throw new Error(`xpEnNivel no puede ser negativo: ${xpEnNivel}`);
  if (xpPorNivel <= 0) throw new Error(`xpPorNivel debe ser positivo: ${xpPorNivel}`);
  if (xpEnNivel > xpPorNivel) {
    throw new Error(`xpEnNivel (${xpEnNivel}) no puede exceder xpPorNivel (${xpPorNivel})`);
  }

  // Hitos ordenados ascendentemente por nivel, sin asumir que la entrada
  // ya viene ordenada (los usuarios pueden personalizarlos en premium).
  const ordenados = [...hitos].sort((a, b) => a.nivel - b.nivel);
  const proximo = ordenados.find((h) => h.nivel > nivelActual) ?? null;

  if (proximo === null) {
    return {
      proximo: null,
      xpFalta: 0,
      jefeFinalSuperado: nivelActual === NIVEL_DESTINO,
    };
  }

  const xpFalta = (proximo.nivel - nivelActual) * xpPorNivel - xpEnNivel;

  return {
    proximo,
    xpFalta,
    jefeFinalSuperado: false,
  };
}
