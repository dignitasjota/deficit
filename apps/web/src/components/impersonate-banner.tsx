'use client';

import type { TokenPair } from '@perdida-peso/schemas';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'pp:impersonate-prev';

interface PrevSession {
  tokens: TokenPair | null;
  adminEmail: string;
}

/**
 * Banner permanente que aparece cuando un admin está impersonando a
 * otro usuario. Se basa en `localStorage` (`pp:impersonate-prev`),
 * persistido por la página `/admin/users/[id]` antes de llamar al
 * endpoint `impersonate`.
 *
 * Al pulsar "Salir": revoca la sesión target (logout normal) y
 * restaura los tokens originales del admin antes de redirigir.
 */
export function ImpersonateBanner() {
  const { api, refresh } = useAuth();
  const [prev, setPrev] = useState<PrevSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setPrev(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PrevSession;
      if (parsed?.adminEmail) setPrev(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  if (!prev) return null;

  async function onExit() {
    setLoading(true);
    try {
      // Revocar la sesión target (logout normal del usuario impersonado).
      try {
        await api.logout();
      } catch {
        // No bloquear si falla; igualmente vamos a restaurar.
      }
      // Restaurar tokens del admin.
      api.setTokens(prev?.tokens ?? null);
      window.localStorage.removeItem(STORAGE_KEY);
      await refresh();
      window.location.href = '/admin';
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-40 border-b px-3 py-2 font-[family-name:var(--font-vt323)] text-base flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: 'color-mix(in oklch, var(--color-neon-red) 14%, var(--color-bg))',
        borderColor: 'var(--color-neon-red)',
        boxShadow: '0 0 12px -4px var(--color-neon-red)',
      }}
      role="alert"
    >
      <p>
        <span style={{ color: 'var(--color-neon-red)' }}>▣ MODO IMPERSONACIÓN</span>
        {' · '}
        admin <span style={{ color: 'var(--color-neon-cyan)' }}>{prev.adminEmail}</span>
      </p>
      <Button tone="red" size="sm" onClick={onExit} disabled={loading}>
        {loading ? '…' : '[ Salir de impersonación ]'}
      </Button>
    </div>
  );
}
