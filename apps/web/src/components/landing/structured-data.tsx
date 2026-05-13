import { FAQ_ITEMS } from './faq-data';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://deficit.app';

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Déficit',
          url: SITE_URL,
          logo: `${SITE_URL}/icon-512`,
          description:
            'Sistema RPG real para perder peso con gamificación profunda: XP por déficit calórico, 9 atributos, niveles 0-80 y colchón semanal.',
          inLanguage: 'es-ES',
        })}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Déficit',
          applicationCategory: 'HealthApplication',
          applicationSubCategory: 'Weight Loss',
          operatingSystem: 'Web, iOS (PWA), Android (PWA)',
          url: SITE_URL,
          image: `${SITE_URL}/opengraph-image`,
          description:
            'App de pérdida de peso con sistema RPG: gana XP por déficit calórico, sube 9 atributos, avanza por niveles 0-80 y compensa malas semanas con tu colchón. Trial 14 días sin tarjeta.',
          inLanguage: 'es-ES',
          offers: [
            {
              '@type': 'Offer',
              name: 'Free',
              price: '0',
              priceCurrency: 'EUR',
              description:
                'Peso báscula, XP por déficit, 7 atributos manuales, niveles 0-10, bitácora reciente.',
              availability: 'https://schema.org/InStock',
            },
            {
              '@type': 'Offer',
              name: 'Premium',
              price: '4.99',
              priceCurrency: 'EUR',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: '4.99',
                priceCurrency: 'EUR',
                billingDuration: 'P1M',
              },
              description:
                'Todo lo de Free + hidratación + atributos automáticos + gráfica + colchón + niveles 0-80 + camino con compra de niveles. Trial 14 días gratis sin tarjeta.',
              availability: 'https://schema.org/InStock',
            },
          ],
        })}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          inLanguage: 'es-ES',
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        })}
      />
    </>
  );
}
