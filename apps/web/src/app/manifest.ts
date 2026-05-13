import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Déficit · Sistema RPG',
    short_name: 'Déficit',
    description:
      'Pérdida de peso con gamificación RPG: XP, niveles, atributos y colchón.',
    lang: 'es-ES',
    dir: 'ltr',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0e16',
    theme_color: '#0d0e10',
    categories: ['health', 'fitness', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icons/icon-master.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
