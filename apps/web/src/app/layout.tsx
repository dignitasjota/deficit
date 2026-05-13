import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Press_Start_2P, VT323 } from 'next/font/google';
import { CookieBanner } from '@/components/cookie-banner';
import { EasterEggsListener } from '@/components/easter-eggs';
import { ImpersonateBanner } from '@/components/impersonate-banner';
import { AuthProvider } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { ThemeApplier } from '@/lib/theme';
import './globals.css';

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
});

const jetBrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://deficit.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Déficit · Sistema RPG para perder peso',
    template: '%s · Déficit',
  },
  description:
    'Pierde peso jugando: XP por déficit calórico, 9 atributos RPG, niveles 0-80 y colchón semanal. App de pérdida de peso con gamificación profunda. 14 días gratis sin tarjeta.',
  applicationName: 'Déficit',
  authors: [{ name: 'Déficit' }],
  generator: 'Next.js',
  keywords: [
    'déficit calórico',
    'perder peso',
    'app perder peso',
    'gamificación pérdida de peso',
    'rpg fitness',
    'app fitness español',
    'pesarse diariamente',
    'tracking peso',
    'colchón calórico',
    'alternativa myfitnesspal',
  ],
  category: 'health',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: SITE_URL,
    siteName: 'Déficit',
    title: 'Déficit · Pierde peso jugando',
    description:
      'Sistema RPG real para perder peso. XP por déficit calórico, 9 atributos, niveles 0-80 y colchón semanal. 14 días gratis sin tarjeta.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Déficit · Pierde peso jugando',
    description:
      'Sistema RPG para perder peso: XP, 9 atributos, niveles 0-80, colchón semanal.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  appleWebApp: {
    capable: true,
    title: 'Déficit',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false, email: false, address: false },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: '#0d0e10',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="cyberpunk"
      className={`${vt323.variable} ${pressStart.variable} ${jetBrains.variable}`}
    >
      <body>
        <QueryProvider>
          <AuthProvider>
            <ThemeApplier />
            <ImpersonateBanner />
            {children}
            <CookieBanner />
          </AuthProvider>
        </QueryProvider>
        <EasterEggsListener />
      </body>
    </html>
  );
}
