'use client';

import { ApiError } from '@perdida-peso/api-client';
import Link from 'next/link';
import { useState } from 'react';
import {
  TerminalButton,
  TerminalError,
  TerminalInput,
  TerminalLabel,
  TerminalShell,
} from '@/components/TerminalShell';
import { useAuth } from '@/lib/auth-context';

export default function ForgotPasswordPage() {
  const { api } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.requestPasswordReset(email);
      setDone(true);
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <TerminalShell title="RECUPERAR" subtitle="email enviado">
        <p className="text-xl" style={{ color: 'var(--color-neon-green)' }}>
          ✓ Si el email existe en el sistema, recibirás un mensaje con
          instrucciones en los próximos minutos.
        </p>
        <p className="mt-4 text-base opacity-70">
          Revisa también la carpeta de spam. El link caduca en 1 hora.
        </p>
        <p className="mt-6">
          <Link href="/login" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
            ← Volver al login
          </Link>
        </p>
      </TerminalShell>
    );
  }

  return (
    <TerminalShell title="RECUPERAR" subtitle="restablecer contraseña">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <TerminalLabel>email</TerminalLabel>
          <TerminalInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <TerminalButton type="submit" loading={loading}>
          [ Enviar instrucciones ]
        </TerminalButton>
        <TerminalError message={error} />
      </form>
      <p className="mt-6 text-base opacity-70">
        <Link href="/login" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
          ← Volver al login
        </Link>
      </p>
    </TerminalShell>
  );
}

function readError(e: ApiError): string {
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
