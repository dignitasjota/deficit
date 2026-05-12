import { z } from 'zod';
import { isoDateSchema } from './common.js';

export const dailyWeightInputSchema = z.object({
  fecha: isoDateSchema,
  pesoKg: z.number().positive().min(30).max(400),
});
export type DailyWeightInput = z.infer<typeof dailyWeightInputSchema>;

export const dailyWeightSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  pesoKg: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DailyWeight = z.infer<typeof dailyWeightSchema>;

export const dailyWeightListInputSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type DailyWeightListInput = z.infer<typeof dailyWeightListInputSchema>;
