'use client';

import { ApiError } from '@perdida-peso/api-client';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

/**
 * Banner naranja que se muestra cuando el usuario está autenticado
 * pero no ha verificado su email todavía.
 *
 * Se renderiza en la home, encima de las cards. Botón para reenviar
 * + link a /settings para más detalle.
 */
export function VerifyEmailBanner() {
  const { api, me } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me || me.emailVerifiedAt) return null;

  async function onResend() {
    setLoading(true);
    setError(null);
    try {
      await api.resendVerification();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="border px-3 py-2 font-[family-name:var(--font-vt323)] text-base flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: 'var(--color-neon-orange)',
        background: 'color-mix(in oklch, var(--color-neon-orange) 8%, transparent)',
        boxShadow: '0 0 10px -4px var(--color-neon-orange)',
      }}
      role="status"
    >
      <p>
        <span style={{ color: 'var(--color-neon-orange)' }}>▲ EMAIL SIN VERIFICAR</span>
        {' · '}
        Revisa tu bandeja{me.email ? ` (${me.email})` : ''} para activar la cuenta.
      </p>
      <div className="flex items-center gap-2">
        {done ? (
          <span style={{ color: 'var(--color-neon-green)' }}>✓ email reenviado</span>
        ) : (
          <Button tone="orange" size="sm" onClick={onResend} disabled={loading}>
            {loading ? '…' : 'Reenviar'}
          </Button>
        )}
        <Link
          href="/settings"
          className="underline"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          ajustes
        </Link>
      </div>
      {error && (
        <span style={{ color: 'var(--color-neon-red)' }}>✗ {error}</span>
      )}
    </div>
  );
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
