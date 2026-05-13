import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://deficit.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/legal/', '/login', '/register'],
        disallow: [
          '/app',
          '/app/',
          '/admin',
          '/admin/',
          '/onboarding',
          '/settings',
          '/verify-email',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
