import { z } from 'zod';

export const sexoSchema = z.enum(['M', 'F']);
export type Sexo = z.infer<typeof sexoSchema>;

export const factorActividadSchema = z.enum([
  'sedentario',
  'ligero',
  'moderado',
  'activo',
  'muy_activo',
]);
export type FactorActividad = z.infer<typeof factorActividadSchema>;

export const atributoCodigoSchema = z.enum([
  'FUE',
  'VIT',
  'DES',
  'INT',
  'CRE',
  'ESP',
  'CAR',
  'HID',
  'PRO',
]);
export type AtributoCodigo = z.infer<typeof atributoCodigoSchema>;

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');
