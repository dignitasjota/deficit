import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Precios · Free y Premium 4,99 €/mes',
  description:
    'Free para siempre con XP, atributos manuales y niveles 0-10. Premium 4,99 €/mes con hidratación, atributos auto, gráficas, colchón, camino L0-80 y compra de niveles. Trial 14 días gratis sin tarjeta.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Precios Déficit · Free vs Premium',
    description:
      'Free para siempre o Premium 4,99 €/mes con 14 días gratis sin tarjeta.',
    type: 'website',
    locale: 'es_ES',
    url: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
