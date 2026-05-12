'use client';

import { ApiError } from '@perdida-peso/api-client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { TerminalShell } from '@/components/TerminalShell';
import { useAuth } from '@/lib/auth-context';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const { api, refresh } = useAuth();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error' | 'no-token'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (!token) {
      setStatus('no-token');
      return;
    }
    api
      .verifyEmail(token)
      .then(async () => {
        setStatus('ok');
        // Refresh `me` para que la home oculte el banner inmediatamente.
        await refresh();
      })
      .catch((e) => {
        setStatus('error');
        if (e instanceof ApiError && e.status === 400) {
          setError('Token inválido o caducado.');
        } else {
          setError('Error inesperado verificando el email.');
        }
      });
  }, [token, api, refresh]);

  if (status === 'verifying') {
    return (
      <TerminalShell title="VERIFY" subtitle="comprobando token…">
        <p
          className="terminal-cursor text-2xl font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          ▶ verificando
        </p>
      </TerminalShell>
    );
  }

  if (status === 'no-token') {
    return (
      <TerminalShell title="VERIFY" subtitle="token ausente">
        <p style={{ color: 'var(--color-neon-red)' }}>
          ✗ Falta el token en la URL.
        </p>
        <p className="mt-6">
          <Link href="/" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
            ← Volver
          </Link>
        </p>
      </TerminalShell>
    );
  }

  if (status === 'error') {
    return (
      <TerminalShell title="VERIFY" subtitle="error">
        <p className="text-xl" style={{ color: 'var(--color-neon-red)' }}>
          ✗ {error}
        </p>
        <p className="mt-6 text-base">
          Inicia sesión y solicita un nuevo email desde{' '}
          <Link href="/settings" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
            /settings
          </Link>
          .
        </p>
      </TerminalShell>
    );
  }

  return (
    <TerminalShell title="VERIFY" subtitle="email verificado">
      <p className="text-xl" style={{ color: 'var(--color-neon-green)' }}>
        ✓ Email verificado. Tu cuenta está activa.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
          → Ir al dashboard
        </Link>
      </p>
    </TerminalShell>
  );
}
