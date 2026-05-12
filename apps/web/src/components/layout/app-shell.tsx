'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export interface AppShellProps {
  /** Contenido de la sidebar izquierda (avatar + stats). */
  sidebar: ReactNode;
  /** Contenido principal (columna derecha). */
  children: ReactNode;
}

/**
 * Layout principal autenticado: sidebar izquierda fija + columna
 * derecha con scroll, header sticky con email + logout.
 *
 * Replica la estructura visual de la imagen 1 del sistema original.
 */
export function AppShell({ sidebar, children }: AppShellProps) {
  const { me, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip-link accesible por teclado, oculto hasta recibir foco. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-[color:var(--color-bg-elevated)] focus:px-3 focus:py-2 focus:text-base focus:outline-none focus-neon"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        Saltar al contenido principal
      </a>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b px-3 py-2 sm:px-4"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg)',
        }}
      >
        <div className="flex min-w-0 items-baseline gap-2 font-[family-name:var(--font-vt323)] sm:gap-3">
          <span
            className="truncate text-xl neon-glow sm:text-2xl"
            style={{ color: 'var(--color-neon-green)' }}
          >
            ▶ DEFICIT_SYS
          </span>
          <span
            className="hidden text-base sm:inline"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            v0.0.0
          </span>
        </div>
        <div className="flex items-center gap-2 font-[family-name:var(--font-vt323)] text-base sm:gap-3">
          {me && (
            <span
              className="hidden max-w-[14rem] truncate md:inline"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              [<span style={{ color: 'var(--color-neon-cyan)' }}>{me.email}</span>]
            </span>
          )}
          {me?.role === 'admin' && (
            <Link
              href="/admin"
              className="hidden sm:inline-block underline"
              style={{ color: 'var(--color-neon-pink)' }}
            >
              ▣ admin
            </Link>
          )}
          <Button
            variant="ghost"
            tone="orange"
            size="sm"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">logout</span>
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-3">{sidebar}</aside>

        {/* Main */}
        <main id="main-content" className="flex-1 space-y-3">{children}</main>
      </div>

      <footer
        className="border-t px-4 py-3 text-center text-sm font-[family-name:var(--font-vt323)]"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-fg-subtle)',
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>© Déficit · v0.0.0</span>
          <Link
            href="/legal/terminos"
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Términos
          </Link>
          <Link
            href="/legal/privacidad"
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Privacidad
          </Link>
          <Link
            href="/legal/cookies"
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Cookies
          </Link>
          <Link
            href="/settings"
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Ajustes
          </Link>
        </div>
      </footer>
    </div>
  );
}
