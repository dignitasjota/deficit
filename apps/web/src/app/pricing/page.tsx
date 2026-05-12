'use client';

import { ApiError } from '@perdida-peso/api-client';
import type { SubscriptionPeriod } from '@perdida-peso/schemas';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

const FREE_FEATURES = [
  'Peso báscula y media móvil 7d',
  'XP por déficit calórico y pasos',
  'Atributos manuales (FUE/VIT/DES/INT/CRE/ESP/CAR)',
  'Niveles 0–10',
  'Bitácora últimos 30 días',
];

const PREMIUM_FEATURES = [
  'Todo lo de Free',
  'Hidratación con meta y multiplicadores',
  'Atributos automáticos HID y PRO',
  'Niveles 0–80 con camino al destino',
  'Bitácora y registro completos',
  'Gráfica de evolución con bandas',
  'Semanas y colchón',
  'Compra de niveles desde colchón',
  'Export RGPD JSON',
];

export default function PricingPage() {
  const { api, me, loading } = useAuth();
  const [period, setPeriod] = useState<SubscriptionPeriod>('month');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubscribe() {
    if (!me) {
      window.location.href = '/register';
      return;
    }
    setLoadingCheckout(true);
    setError(null);
    try {
      const { url } = await api.createCheckout({ period });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
      setLoadingCheckout(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <header className="text-center font-[family-name:var(--font-vt323)]">
          <h1
            className="text-4xl uppercase tracking-widest"
            style={{ color: 'var(--color-neon-green)' }}
          >
            ▶ PLANES
          </h1>
          <p
            className="mt-2 text-lg"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Empieza con 14 días Premium gratis. Sin tarjeta. Cancela cuando quieras.
          </p>
        </header>

        <div className="flex justify-center gap-2 font-[family-name:var(--font-vt323)] text-base">
          {(['month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="border px-4 py-1 uppercase tracking-widest"
              style={{
                color: period === p ? 'var(--color-neon-orange)' : 'var(--color-fg-muted)',
                borderColor: period === p ? 'var(--color-neon-orange)' : 'var(--color-border)',
                background:
                  period === p
                    ? 'color-mix(in oklch, var(--color-neon-orange) 14%, transparent)'
                    : 'transparent',
              }}
            >
              {p === 'month' ? 'Mensual' : 'Anual · −33%'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NeonCard tone="muted" title="FREE" symbol="◇">
            <p
              className="mb-3 font-[family-name:var(--font-vt323)] text-3xl tabular-nums"
              style={{ color: 'var(--color-fg)' }}
            >
              0,00 €
              <span
                className="ml-2 text-base"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                /siempre
              </span>
            </p>
            <ul className="space-y-1 text-base">
              {FREE_FEATURES.map((f) => (
                <li key={f}>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>▸</span> {f}
                </li>
              ))}
            </ul>
            {!me && (
              <Link
                href="/register"
                className="mt-4 block text-center underline font-[family-name:var(--font-vt323)] text-base"
                style={{ color: 'var(--color-neon-cyan)' }}
              >
                [ Crear cuenta gratis ]
              </Link>
            )}
          </NeonCard>

          <NeonCard tone="orange" title="PREMIUM" symbol="◆">
            <p
              className="mb-3 font-[family-name:var(--font-vt323)] text-3xl tabular-nums"
              style={{ color: 'var(--color-neon-orange)' }}
            >
              {period === 'month' ? '4,99 €' : '39,99 €'}
              <span
                className="ml-2 text-base"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {period === 'month' ? '/mes' : '/año'}
              </span>
            </p>
            <ul className="space-y-1 text-base">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f}>
                  <span style={{ color: 'var(--color-neon-orange)' }}>▸</span> {f}
                </li>
              ))}
            </ul>
            <Button
              tone="orange"
              onClick={onSubscribe}
              disabled={loading || loadingCheckout}
              className="mt-4 w-full"
            >
              {loadingCheckout
                ? '…'
                : me
                  ? '[ Suscribirse · Stripe ]'
                  : '[ Crear cuenta y suscribirse ]'}
            </Button>
            {error && (
              <p
                className="mt-2 text-base font-[family-name:var(--font-vt323)] text-center"
                style={{ color: 'var(--color-neon-red)' }}
              >
                ✗ {error}
              </p>
            )}
          </NeonCard>
        </div>

        <p
          className="text-center text-sm font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          IVA calculado automáticamente por Stripe Tax · pagos seguros con Stripe
        </p>

        <div
          className="text-center text-sm font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          <Link href="/" className="underline mr-3" style={{ color: 'var(--color-neon-cyan)' }}>
            ← Volver
          </Link>
          <Link
            href="/legal/terminos"
            className="underline mr-3"
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
        </div>
      </div>
    </main>
  );
}

function readError(e: ApiError): string {
  if (e.status === 400) return 'Configuración de pago no disponible. Contacta con soporte.';
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
