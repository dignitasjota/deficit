/**
 * Constantes globales del dominio (idénticas para todos los usuarios).
 * Ver docs/DOMAIN.md §14 para la lista oficial.
 */

export const KCAL_POR_KG_GRASA = 7700;
export const NIVEL_DESTINO = 80;
export const KCAL_POR_PASO_FACTOR = 0.00032;
export const PENALIZACION_EJERCICIO = 0.7;
export const TOPE_PASOS_DIARIO = 25_000;
export const SODIO_BASE_G = 2.0;
export const LITROS_BASE = 2.0;
export const LITROS_POR_G_SODIO_EXTRA = 0.25;
export const XP_SEMANAL_META = 7700;

export const MULTIPLICADOR_BEBIDA = {
  agua: 1.0,
  cafe_te: 0.9,
  refresco_zero: 0.7,
  azucarada: 0,
  alcohol: 0,
} as const;

export const RETENCION_GLUCOGENO_KG = 1.0;
export const RETENCION_DIGESTIVO_KG = 0.3;
export const RETENCION_SODIO_FACTOR = 0.4;
export const RANGO_MIN_RATIO = 0.5;
export const RANGO_MAX_RATIO = 1.2;
