'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Banner que aparece en home si el usuario está en trial. Muestra
 * los días restantes y link a /pricing.
 *
 * Si el trial ya expiró y el plan es free, muestra un banner
 * distinto invitando a suscribirse.
 */
export function TrialBanner() {
  const { me } = useAuth();
  if (!me) return null;

  // Trial activo.
  if (me.trialEndsAt) {
    const daysLeft = Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / MS_DAY);
    if (daysLeft > 0 && me.effectivePlan === 'premium' && me.plan === 'free') {
      return (
        <Banner
          tone="cyan"
          icon="✦"
          title={`TRIAL PREMIUM · ${daysLeft} día${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}`}
          message="Tras el trial, tu cuenta volverá a Free salvo que te suscribas."
          ctaLabel="Suscribirse"
          ctaHref="/pricing"
        />
      );
    }
  }

  // Free post-trial: invitar a suscribirse.
  if (me.effectivePlan === 'free') {
    return (
      <Banner
        tone="orange"
        icon="◆"
        title="DESBLOQUEA PREMIUM"
        message="Hidratación, gráfica de evolución, semanas, camino al destino y export RGPD."
        ctaLabel="Ver planes"
        ctaHref="/pricing"
      />
    );
  }

  return null;
}

function Banner({
  tone,
  icon,
  title,
  message,
  ctaLabel,
  ctaHref,
}: {
  tone: 'cyan' | 'orange';
  icon: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const color = tone === 'cyan' ? 'var(--color-neon-cyan)' : 'var(--color-neon-orange)';
  return (
    <div
      className="border px-3 py-2 font-[family-name:var(--font-vt323)] text-base flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: color,
        background: `color-mix(in oklch, ${color} 8%, transparent)`,
        boxShadow: `0 0 10px -4px ${color}`,
      }}
      role="status"
    >
      <p>
        <span style={{ color }}>{icon} {title}</span>
        <span style={{ color: 'var(--color-fg-muted)' }}>
          {' · '}
          {message}
        </span>
      </p>
      <Link
        href={ctaHref}
        className="border px-3 py-1 uppercase tracking-widest text-center"
        style={{
          color,
          borderColor: color,
          background: `color-mix(in oklch, ${color} 12%, transparent)`,
        }}
      >
        [ {ctaLabel} ]
      </Link>
    </div>
  );
}
