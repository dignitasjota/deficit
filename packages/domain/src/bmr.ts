import type { FactorActividad, Sexo } from './types.js';

const FACTOR_ACTIVIDAD_VALORES: Record<FactorActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

export interface CalcBMRInput {
  pesoKg: number;
  alturaCm: number;
  edad: number;
  sexo: Sexo;
}

/**
 * BMR (Basal Metabolic Rate) según Mifflin–St Jeor.
 * Ver docs/DOMAIN.md §3.1.
 *
 * Hombre:  BMR = 10·peso + 6.25·altura − 5·edad + 5
 * Mujer:   BMR = 10·peso + 6.25·altura − 5·edad − 161
 */
export function calcBMR(input: CalcBMRInput): number {
  const { pesoKg, alturaCm, edad, sexo } = input;

  if (pesoKg <= 0) {
    throw new Error(`pesoKg debe ser positivo: ${pesoKg}`);
  }
  if (alturaCm <= 0) {
    throw new Error(`alturaCm debe ser positiva: ${alturaCm}`);
  }
  if (edad <= 0) {
    throw new Error(`edad debe ser positiva: ${edad}`);
  }

  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return sexo === 'M' ? base + 5 : base - 161;
}

/**
 * TDEE (Total Daily Energy Expenditure) = BMR × factor de actividad.
 * Ver docs/DOMAIN.md §3.2.
 */
export function calcTDEE(bmr: number, factor: FactorActividad): number {
  if (bmr <= 0) {
    throw new Error(`bmr debe ser positivo: ${bmr}`);
  }
  return bmr * FACTOR_ACTIVIDAD_VALORES[factor];
}

export function getFactorActividadValor(factor: FactorActividad): number {
  return FACTOR_ACTIVIDAD_VALORES[factor];
}
