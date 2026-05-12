'use client';

import type { ThemePreference } from '@perdida-peso/schemas';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

const DEFAULT_THEME: ThemePreference = 'cyberpunk';

/**
 * Aplica el `data-theme` al `<html>` según la preferencia del usuario.
 * Montar este componente una vez en `RootLayout`.
 *
 * Plumbing preparado para skins Premium: hoy `cyberpunk` es la única
 * opción. Para añadir una nueva skin (ej. `kawaii`):
 *   1. Añadir el id al enum `userThemeEnum` (BBDD) y al
 *      `themePreferenceSchema` (Zod).
 *   2. Crear bloque CSS `:root[data-theme="kawaii"] { ... }` en
 *      `globals.css` sobreescribiendo las variables de paleta/fonts.
 *   3. Pintar selector en `/settings` con las opciones nuevas.
 *   4. (Si es Premium) feature gate en el endpoint `updateTheme`.
 */
export function ThemeApplier() {
  const { me } = useAuth();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const theme = me?.themePreference ?? DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
  }, [me?.themePreference]);

  return null;
}
