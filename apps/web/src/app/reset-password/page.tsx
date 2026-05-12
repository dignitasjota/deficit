'use client';

import { ApiError } from '@perdida-peso/api-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  TerminalButton,
  TerminalError,
  TerminalInput,
  TerminalLabel,
  TerminalShell,
} from '@/components/TerminalShell';
import { useAuth } from '@/lib/auth-context';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <TerminalShell title="RESET" subtitle="token ausente">
        <p className="text-xl" style={{ color: 'var(--color-neon-red)' }}>
          ✗ Falta el token en la URL. Solicita un nuevo email de
          recuperación desde la página de login.
        </p>
        <p className="mt-6">
          <Link
            href="/forgot-password"
            className="underline"
            style={{ color: 'var(--color-neon-cyan)' }}
          >
            Solicitar nuevo email
          </Link>
        </p>
      </TerminalShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <TerminalShell title="RESET" subtitle="contraseña actualizada">
        <p className="text-xl" style={{ color: 'var(--color-neon-green)' }}>
          ✓ Contraseña actualizada. Redirigiendo al login…
        </p>
      </TerminalShell>
    );
  }

  return (
    <TerminalShell title="RESET" subtitle="nueva contraseña">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <TerminalLabel>nueva contraseña (mín. 12, letras y números)</TerminalLabel>
          <TerminalInput
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <TerminalLabel>confirmar</TerminalLabel>
          <TerminalInput
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <TerminalButton type="submit" loading={loading}>
          [ Cambiar contraseña ]
        </TerminalButton>
        <TerminalError message={error} />
      </form>
    </TerminalShell>
  );
}

function readError(e: ApiError): string {
  if (e.status === 400) return 'Token inválido o caducado';
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
