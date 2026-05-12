import { KCAL_POR_KG_GRASA, NIVEL_DESTINO, XP_SEMANAL_META } from './constants.js';
import type { ProgressionParams, UserProfile } from './types.js';

/**
 * Calcula los parámetros de progresión derivados del perfil del usuario.
 * Ver docs/DOMAIN.md §2.2 y §4.
 *
 * - kgPorNivel    = (pesoInicial - pesoObjetivo) / 80
 * - xpPorNivel    = kgPorNivel × 7700
 * - xpSemanalMeta = 7700 (FIJO para todos los usuarios)
 * - nivelesPorSemana = xpSemanalMeta / xpPorNivel
 */
export function deriveProgressionParams(
  profile: Pick<UserProfile, 'pesoInicialKg' | 'pesoObjetivoKg'>,
): ProgressionParams {
  const kgAPerder = profile.pesoInicialKg - profile.pesoObjetivoKg;

  if (kgAPerder <= 0) {
    throw new Error(
      `pesoObjetivoKg (${profile.pesoObjetivoKg}) debe ser menor que pesoInicialKg (${profile.pesoInicialKg})`,
    );
  }

  const kgPorNivel = kgAPerder / NIVEL_DESTINO;
  const xpPorNivel = kgPorNivel * KCAL_POR_KG_GRASA;
  const nivelesPorSemana = XP_SEMANAL_META / xpPorNivel;
  const semanasA_L80 = kgAPerder;

  return {
    kgPorNivel,
    xpPorNivel,
    nivelesPorSemana,
    semanasA_L80,
  };
}

export interface LevelState {
  nivelActual: number;
  xpEnNivel: number;
  xpFalta: number;
  progresoPct: number;
  jefeFinalSuperado: boolean;
}

/**
 * Calcula el estado de nivel a partir del XP total acumulado.
 * Ver docs/DOMAIN.md §4.1.
 */
export function calcLevelState(xpTotal: number, xpPorNivel: number): LevelState {
  if (xpTotal < 0) {
    throw new Error(`xpTotal no puede ser negativo: ${xpTotal}`);
  }
  if (xpPorNivel <= 0) {
    throw new Error(`xpPorNivel debe ser positivo: ${xpPorNivel}`);
  }

  const nivelCrudo = Math.floor(xpTotal / xpPorNivel);
  const nivelActual = Math.min(nivelCrudo, NIVEL_DESTINO);
  const jefeFinalSuperado = nivelCrudo >= NIVEL_DESTINO;

  if (jefeFinalSuperado) {
    return {
      nivelActual: NIVEL_DESTINO,
      xpEnNivel: xpPorNivel,
      xpFalta: 0,
      progresoPct: 1,
      jefeFinalSuperado: true,
    };
  }

  const xpEnNivel = xpTotal - nivelActual * xpPorNivel;
  const xpFalta = xpPorNivel - xpEnNivel;
  const progresoPct = xpEnNivel / xpPorNivel;

  return {
    nivelActual,
    xpEnNivel,
    xpFalta,
    progresoPct,
    jefeFinalSuperado: false,
  };
}
