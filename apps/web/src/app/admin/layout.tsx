'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace('/login');
      return;
    }
    if (me.role !== 'admin') {
      router.replace('/app');
    }
  }, [loading, me, router]);

  if (loading || !me || me.role !== 'admin') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p
          className="text-2xl font-[family-name:var(--font-vt323)] terminal-cursor"
          style={{ color: 'var(--color-neon-pink)' }}
        >
          ▶ verificando privilegios
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30 border-b px-4 py-2"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-neon-pink)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 font-[family-name:var(--font-vt323)]">
          <Link
            href="/admin"
            className="text-2xl"
            style={{ color: 'var(--color-neon-pink)' }}
          >
            ▣ ADMIN_PANEL
          </Link>
          <nav className="flex flex-wrap gap-3 text-base">
            <Link
              href="/admin"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Métricas
            </Link>
            <Link
              href="/admin/users"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Usuarios
            </Link>
            <Link
              href="/admin/audit"
              className="underline"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              Audit log
            </Link>
            <Link
              href="/app"
              className="underline"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              ← volver a la app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 space-y-4">
        {children}
      </main>
    </div>
  );
}
