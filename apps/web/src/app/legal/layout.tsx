import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30 border-b px-4 py-2"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between font-[family-name:var(--font-vt323)]">
          <Link
            href="/"
            className="text-2xl"
            style={{ color: 'var(--color-neon-green)' }}
          >
            ▶ DEFICIT_SYS
          </Link>
          <nav className="flex gap-4 text-base">
            <Link
              href="/legal/terminos"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Términos
            </Link>
            <Link
              href="/legal/privacidad"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Privacidad
            </Link>
            <Link
              href="/legal/cookies"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Cookies
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 font-[family-name:var(--font-vt323)] text-base sm:text-lg">
        <article className="prose-legal">{children}</article>
      </main>
      <footer
        className="border-t px-4 py-3 text-center text-xs"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-fg-subtle)',
        }}
      >
        © Déficit · v0.0.0
      </footer>
    </div>
  );
}
