import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear cuenta · 14 días gratis sin tarjeta',
  description:
    'Crea tu personaje en Déficit y empieza con 14 días de Premium gratis sin tarjeta. Sistema RPG real para perder peso con XP, atributos y colchón semanal.',
  alternates: { canonical: '/register' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Empieza gratis en Déficit',
    description:
      'Crea tu personaje en 30 segundos. 14 días de Premium gratis, sin tarjeta.',
    type: 'website',
    locale: 'es_ES',
    url: '/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
