'use client';

import { ApiError } from '@perdida-peso/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  TerminalButton,
  TerminalError,
  TerminalInput,
  TerminalLabel,
  TerminalShell,
} from '@/components/TerminalShell';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { api, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login({ email, password });
      await refresh();
      router.push('/app');
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TerminalShell title="LOGIN_SYS" subtitle="autenticación · v0.0.0">
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
        <div>
          <TerminalLabel>contraseña</TerminalLabel>
          <TerminalInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <TerminalButton type="submit" loading={loading}>
          [ Entrar ]
        </TerminalButton>
        <TerminalError message={error} />
      </form>
      <p className="mt-6 text-xl opacity-70">
        ¿Sin cuenta?{' '}
        <Link href="/register" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>
          Crear cuenta
        </Link>
      </p>
      <p className="mt-2 text-base opacity-70">
        ¿Olvidaste la contraseña?{' '}
        <Link
          href="/forgot-password"
          className="underline"
          style={{ color: 'var(--color-neon-orange)' }}
        >
          Recuperar acceso
        </Link>
      </p>
    </TerminalShell>
  );
}

function readError(e: ApiError): string {
  if (e.status === 401) return 'Credenciales inválidas';
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
