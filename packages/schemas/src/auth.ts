import { z } from 'zod';

/** Política de contraseñas: mínimo 12, al menos una letra y un número. */
const passwordSchema = z
  .string()
  .min(12, 'Mínimo 12 caracteres')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: 'Debe contener letras y números',
  });

export const registerInputSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshInputSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

/**
 * Identificadores de skin/tema visual. `cyberpunk` es el default y único
 * activo. El plumbing está preparado para añadir más cuando llegue la
 * feature Premium de skins (kawaii, wizardry, etc.).
 */
export const themePreferenceSchema = z.enum(['cyberpunk']);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const meSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  hasProfile: z.boolean(),
  avatarId: z.string().nullable(),
  /** Rol del usuario. `admin` desbloquea el panel /admin. */
  role: z.enum(['user', 'admin']),
  /** Plan declarado en BBDD (`free` por defecto). */
  plan: z.enum(['free', 'premium']),
  /** Plan efectivo, considerando trial activo. Lo usa el frontend para gating UI. */
  effectivePlan: z.enum(['free', 'premium']),
  /** ISO timestamp si tiene trial todavía no consumido o NULL. */
  trialEndsAt: z.string().datetime().nullable(),
  /** Skin visual activa. El frontend aplica `data-theme` al `<html>`. */
  themePreference: themePreferenceSchema,
});
export type Me = z.infer<typeof meSchema>;

/** Body para `PUT /v1/users/me/theme`. */
export const updateThemeInputSchema = z.object({
  themePreference: themePreferenceSchema,
});
export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;

/** Token de verificación de email o reset de password (cuerpo POST). */
export const tokenInputSchema = z.object({
  token: z.string().min(16).max(256),
});
export type TokenInput = z.infer<typeof tokenInputSchema>;

/** Solicitar reset de contraseña por email. */
export const requestPasswordResetInputSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

/** Consumir un reset de contraseña: token + nueva contraseña. */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

/** Borrar cuenta: requiere password actual como confirmación. */
export const deleteAccountInputSchema = z.object({
  password: z.string().min(1).max(128),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
