'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { AvatarId } from '@perdida-peso/schemas';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AvatarGallery } from '@/components/avatar/avatar-gallery';
import {
  TerminalButton,
  TerminalError,
  TerminalInput,
  TerminalLabel,
  TerminalSelect,
  TerminalShell,
} from '@/components/TerminalShell';
import { useAuth } from '@/lib/auth-context';
import { DEFAULT_AVATAR_ID } from '@/lib/avatars';

const FACTORES = [
  { value: 'sedentario', label: 'Sedentario (1.20)' },
  { value: 'ligero', label: 'Ligero (1.375)' },
  { value: 'moderado', label: 'Moderado (1.55)' },
  { value: 'activo', label: 'Activo (1.725)' },
  { value: 'muy_activo', label: 'Muy activo (1.90)' },
] as const;

type Step = 'avatar' | 'profile';

export default function OnboardingPage() {
  const { api, me, loading, refresh } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('avatar');
  const [avatarId, setAvatarId] = useState<AvatarId>(
    (me?.avatarId as AvatarId | null) ?? (DEFAULT_AVATAR_ID as AvatarId),
  );
  const [pesoInicial, setPesoInicial] = useState('');
  const [pesoObjetivo, setPesoObjetivo] = useState('');
  const [altura, setAltura] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [factor, setFactor] = useState<(typeof FACTORES)[number]['value']>('moderado');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !me) router.push('/login');
    if (!loading && me?.hasProfile) router.push('/app');
  }, [loading, me, router]);

  async function onAvatarNext() {
    setError(null);
    try {
      await api.updateAvatar(avatarId);
      await refresh();
      setStep('profile');
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    }
  }

  async function onProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.upsertMyProfile({
        pesoInicialKg: Number(pesoInicial),
        pesoObjetivoKg: Number(pesoObjetivo),
        alturaCm: Number(altura),
        edad: Number(edad),
        sexo,
        factorActividad: factor,
        fechaInicio: new Date().toISOString().slice(0, 10),
      });
      await refresh();
      router.push('/app');
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'avatar') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div
          className="border-2 p-8 max-w-2xl w-full font-[family-name:var(--font-vt323)]"
          style={{
            borderColor: 'var(--color-neon-purple)',
            boxShadow: '0 0 18px -6px var(--color-neon-purple)',
          }}
        >
          <h1
            className="text-3xl mb-1 neon-glow"
            style={{ color: 'var(--color-neon-purple)' }}
          >
            ▶ ONBOARDING_SYS
          </h1>
          <p className="text-xl opacity-70 mb-2">paso 1 / 2 · elige tu avatar</p>
          <div
            className="border border-dashed mb-6 h-px"
            style={{ borderColor: 'var(--color-border)' }}
          />

          <AvatarGallery value={avatarId} onChange={(id) => setAvatarId(id as AvatarId)} />

          <div className="mt-6 flex gap-3">
            <TerminalButton type="button" onClick={() => void onAvatarNext()}>
              [ Continuar ▸ ]
            </TerminalButton>
          </div>
          <TerminalError message={error} />
          <p className="mt-4 text-base opacity-60">
            Podrás cambiarlo más tarde en tu perfil.
          </p>
        </div>
      </main>
    );
  }

  return (
    <TerminalShell
      title="ONBOARDING_SYS"
      subtitle="paso 2 / 2 · perfil de progresión"
      borderColor="var(--color-neon-purple)"
    >
      <form onSubmit={onProfileSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <TerminalLabel>peso inicial (kg)</TerminalLabel>
            <TerminalInput
              type="number"
              step="0.1"
              min="30"
              max="400"
              required
              value={pesoInicial}
              onChange={(e) => setPesoInicial(e.target.value)}
            />
          </div>
          <div>
            <TerminalLabel>peso objetivo (kg)</TerminalLabel>
            <TerminalInput
              type="number"
              step="0.1"
              min="30"
              max="400"
              required
              value={pesoObjetivo}
              onChange={(e) => setPesoObjetivo(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <TerminalLabel>altura (cm)</TerminalLabel>
            <TerminalInput
              type="number"
              step="0.5"
              min="100"
              max="250"
              required
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
            />
          </div>
          <div>
            <TerminalLabel>edad</TerminalLabel>
            <TerminalInput
              type="number"
              min="10"
              max="120"
              required
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <TerminalLabel>sexo</TerminalLabel>
            <TerminalSelect value={sexo} onChange={(e) => setSexo(e.target.value as 'M' | 'F')}>
              <option value="M">Hombre</option>
              <option value="F">Mujer</option>
            </TerminalSelect>
          </div>
          <div>
            <TerminalLabel>actividad</TerminalLabel>
            <TerminalSelect
              value={factor}
              onChange={(e) => setFactor(e.target.value as typeof factor)}
            >
              {FACTORES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </TerminalSelect>
          </div>
        </div>
        <div className="flex gap-3">
          <TerminalButton type="button" onClick={() => setStep('avatar')}>
            [ ◂ Atrás ]
          </TerminalButton>
          <TerminalButton type="submit" loading={submitting}>
            [ Iniciar progresión ]
          </TerminalButton>
        </div>
        <TerminalError message={error} />
      </form>
      <p className="mt-6 text-xl opacity-60">
        Tu objetivo se reparte en 80 niveles. Verás los derivados (XP/nivel,
        fecha estimada L80) en cuanto entres al dashboard.
      </p>
    </TerminalShell>
  );
}

function readError(e: ApiError): string {
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
