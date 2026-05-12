'use client';

import { CURRENT_LEGAL_VERSIONS } from '@perdida-peso/schemas';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'pp:cookies-consent';

interface StoredConsent {
  version: number;
  acceptedAt: string;
}

/**
 * Banner informativo de cookies. Hoy la app solo usa localStorage
 * para tokens auth y preferencias funcionales (no requieren
 * consentimiento bajo ePrivacy), pero registramos la aceptación de la
 * versión actual del documento para tener audit trail si en el futuro
 * añadimos analytics.
 *
 * - Si el usuario está autenticado, también se hace POST al backend
 *   (`/v1/consents`) para registro persistente.
 * - Si la versión cambia (p.ej. a v2), el banner vuelve a aparecer.
 */
export function CookieBanner() {
  const { api, me } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setShow(true);
      return;
    }
    try {
      const stored = JSON.parse(raw) as StoredConsent;
      if (stored.version < CURRENT_LEGAL_VERSIONS.cookies) {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  async function onAccept() {
    const record: StoredConsent = {
      version: CURRENT_LEGAL_VERSIONS.cookies,
      acceptedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setShow(false);
    // Si el usuario está autenticado, registramos en backend.
    if (me) {
      try {
        await api.acceptConsent({
          type: 'cookies',
          version: CURRENT_LEGAL_VERSIONS.cookies,
        });
      } catch {
        // No bloqueamos al usuario si el backend falla; el localStorage
        // es la fuente para volver a mostrar el banner.
      }
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl p-3 sm:p-4"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          role="dialog"
          aria-labelledby="cookie-banner-title"
        >
          <div
            className="border p-3 font-[family-name:var(--font-vt323)] text-base"
            style={{
              background: 'color-mix(in oklch, var(--color-bg-elevated) 95%, transparent)',
              borderColor: 'var(--color-neon-cyan)',
              boxShadow: '0 0 14px -4px var(--color-neon-cyan)',
            }}
          >
            <p
              id="cookie-banner-title"
              className="mb-2"
              style={{ color: 'var(--color-neon-cyan)' }}
            >
              ▶ COOKIES Y ALMACENAMIENTO LOCAL
            </p>
            <p className="mb-3" style={{ color: 'var(--color-fg)' }}>
              Déficit usa <code style={{ color: 'var(--color-neon-cyan)' }}>localStorage</code>{' '}
              para mantener tu sesión y recordar preferencias funcionales.
              No usamos cookies de tracking ni analytics. Más detalle en
              nuestra{' '}
              <Link
                href="/legal/cookies"
                className="underline"
                style={{ color: 'var(--color-neon-orange)' }}
              >
                Política de Cookies
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="border px-3 py-1 uppercase tracking-widest"
                style={{
                  color: 'var(--color-neon-green)',
                  borderColor: 'var(--color-neon-green)',
                  background: 'color-mix(in oklch, var(--color-neon-green) 12%, transparent)',
                }}
              >
                [ Entendido ]
              </button>
              <Link
                href="/legal/privacidad"
                className="underline text-sm"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                Privacidad
              </Link>
              <Link
                href="/legal/terminos"
                className="underline text-sm"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                Términos
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
