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

export default function RegisterPage() {
  const { api, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.register({ email, password });
      await refresh();
      router.push('/onboarding');
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TerminalShell
      title="REGISTER_SYS"
      subtitle="alta de cuenta nueva"
      borderColor="var(--color-neon-cyan)"
    >
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
          <TerminalLabel>contraseña (mín. 12 con letras y números)</TerminalLabel>
          <TerminalInput
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <TerminalLabel>confirmar contraseña</TerminalLabel>
          <TerminalInput
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <TerminalButton type="submit" loading={loading}>
          [ Crear cuenta ]
        </TerminalButton>
        <TerminalError message={error} />
      </form>
      <p className="mt-6 text-xl opacity-70">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="underline" style={{ color: 'var(--color-neon-orange)' }}>
          Iniciar sesión
        </Link>
      </p>
    </TerminalShell>
  );
}

function readError(e: ApiError): string {
  if (e.status === 409) return 'Ese email ya está registrado';
  if (e.body && typeof e.body === 'object' && 'errors' in e.body) {
    const errors = (e.body as { errors: Record<string, string[]> }).errors;
    const first = Object.entries(errors)[0];
    if (first) return `${first[0]}: ${first[1][0]}`;
  }
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
