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

export const metadata: Metadata = {
  title: 'Déficit · Sistema RPG',
  description: 'Sistema de gamificación para pérdida de peso estilo RPG',
  applicationName: 'Déficit',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Déficit',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false, email: false, address: false },
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
