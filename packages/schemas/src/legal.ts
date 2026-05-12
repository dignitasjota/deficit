import { z } from 'zod';

export const consentTypeSchema = z.enum(['terms', 'privacy', 'cookies']);
export type ConsentType = z.infer<typeof consentTypeSchema>;

/**
 * Aceptación de un texto legal versionado. La `version` es el entero
 * actual del documento (incrementa al cambiar el texto). El backend
 * registra fecha + hash de IP + UA del aceptante.
 */
export const acceptConsentInputSchema = z.object({
  type: consentTypeSchema,
  version: z.number().int().positive(),
});
export type AcceptConsentInput = z.infer<typeof acceptConsentInputSchema>;

export const consentRecordSchema = z.object({
  type: consentTypeSchema,
  version: z.number().int().positive(),
  acceptedAt: z.string().datetime(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

export const consentListSchema = z.object({
  consents: z.array(consentRecordSchema),
});
export type ConsentList = z.infer<typeof consentListSchema>;

/**
 * Versiones actuales de los textos legales. Si cambias un documento,
 * incrementa el número correspondiente — el banner volverá a pedir
 * aceptación a usuarios que ya aceptaron una versión anterior.
 */
export const CURRENT_LEGAL_VERSIONS = {
  terms: 1,
  privacy: 1,
  cookies: 1,
} as const satisfies Record<ConsentType, number>;
