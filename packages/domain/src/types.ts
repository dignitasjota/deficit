/**
 * Tipos de dominio compartidos.
 * Los schemas Zod equivalentes viven en @perdida-peso/schemas.
 */

export type Sexo = 'M' | 'F';

export type FactorActividad =
  | 'sedentario'
  | 'ligero'
  | 'moderado'
  | 'activo'
  | 'muy_activo';

export interface UserProfile {
  pesoInicialKg: number;
  pesoObjetivoKg: number;
  alturaCm: number;
  edad: number;
  sexo: Sexo;
  factorActividad: FactorActividad;
}

export interface ProgressionParams {
  kgPorNivel: number;
  xpPorNivel: number;
  nivelesPorSemana: number;
  semanasA_L80: number;
}

export type AtributoCodigo =
  | 'FUE'
  | 'VIT'
  | 'DES'
  | 'INT'
  | 'CRE'
  | 'ESP'
  | 'CAR'
  | 'HID'
  | 'PRO';

export type EstadoSemana = 'EN_CURSO' | 'COMPENSADA' | 'MAS_XP' | 'DEFICIT';

export type BebidaTipo = 'agua' | 'cafe_te' | 'refresco_zero' | 'azucarada' | 'alcohol';

export interface BebidaConsumida {
  tipo: BebidaTipo;
  litros: number;
}

export interface RetentionBreakdown {
  retSodio: number;
  retGlucogeno: number;
  retDigestivo: number;
  retTotal: number;
}

export interface ExpectedRange {
  pesoTeorico: number;
  retencion: RetentionBreakdown;
  rangoMin: number;
  rangoMax: number;
}

export interface WeekResult {
  estado: EstadoSemana;
  xpTotal: number;
  excedente: number;
  colchonRecibido: number;
  colchonInvertido: number;
  colchonResultante: number;
}

export interface Milestone {
  nivel: number;
  nombre: string;
  color?: string;
}

export interface MilestoneState {
  proximo: Milestone | null;
  xpFalta: number;
  jefeFinalSuperado: boolean;
}

export interface ForecastDestination {
  semanasRestantes: number;
  fechaEstimada: Date;
  xpFaltanteParaL80: number;
  colchonAplicable: number;
  xpQueDebeGenerar: number;
}

export interface LevelForecast {
  nivel: number;
  fechaEstimada: Date;
}
