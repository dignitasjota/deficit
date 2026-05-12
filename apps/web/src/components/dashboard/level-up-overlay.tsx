'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface LevelUpEvent {
  from: number;
  to: number;
}

/**
 * Detecta cuando `nivelActual` sube respecto al último valor visto por
 * el usuario. Persiste el último nivel en localStorage para sobrevivir
 * recargas (sin la persistencia, recargar la página justo después de
 * subir de nivel volvería a disparar el overlay).
 *
 * Si es la primera vez que vemos al usuario (sin entrada en
 * localStorage), guardamos el nivel actual sin disparar — evita el
 * "L0 → L0" inicial sobre cuentas nuevas.
 */
export function useLevelUp(nivelActual: number, userId: string | undefined) {
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const lastDispatchedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (nivelActual < 0) return;
    if (typeof window === 'undefined') return;

    const key = `pp:lastSeenLevel:${userId}`;
    const stored = window.localStorage.getItem(key);
    const prev = stored !== null ? Number.parseInt(stored, 10) : null;

    if (prev === null || Number.isNaN(prev)) {
      window.localStorage.setItem(key, String(nivelActual));
      return;
    }

    if (nivelActual > prev && lastDispatchedRef.current !== nivelActual) {
      lastDispatchedRef.current = nivelActual;
      setLevelUp({ from: prev, to: nivelActual });
      window.localStorage.setItem(key, String(nivelActual));
    } else if (nivelActual < prev) {
      // Backfill manual (test data, reset, etc.) — actualizamos sin disparar.
      window.localStorage.setItem(key, String(nivelActual));
    }
  }, [nivelActual, userId]);

  return {
    levelUp,
    dismiss: () => setLevelUp(null),
  };
}

interface LevelUpOverlayProps {
  event: LevelUpEvent | null;
  onDismiss: () => void;
}

export function LevelUpOverlay({ event, onDismiss }: LevelUpOverlayProps) {
  return (
    <AnimatePresence>
      {event && <LevelUpInner key={`${event.from}-${event.to}`} event={event} onDismiss={onDismiss} />}
    </AnimatePresence>
  );
}

function LevelUpInner({ event, onDismiss }: { event: LevelUpEvent; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 3500);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="alertdialog"
      aria-label={`Subida de nivel: ${event.from} a ${event.to}`}
      onClick={onDismiss}
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'color-mix(in oklch, var(--color-bg) 75%, transparent)' }}
      />
      <motion.div
        className="relative cursor-pointer text-center font-[family-name:var(--font-vt323)] px-8"
        initial={{ scale: 0.5, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      >
        <motion.h1
          className="text-5xl sm:text-7xl uppercase tracking-widest mb-4"
          style={{
            color: 'var(--color-neon-yellow)',
            textShadow:
              '0 0 12px var(--color-neon-yellow), 0 0 28px var(--color-neon-orange), 0 0 60px var(--color-neon-orange)',
          }}
          animate={{
            textShadow: [
              '0 0 12px var(--color-neon-yellow), 0 0 28px var(--color-neon-orange), 0 0 60px var(--color-neon-orange)',
              '0 0 18px var(--color-neon-yellow), 0 0 40px var(--color-neon-magenta), 0 0 80px var(--color-neon-magenta)',
              '0 0 12px var(--color-neon-yellow), 0 0 28px var(--color-neon-orange), 0 0 60px var(--color-neon-orange)',
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          ★ LEVEL UP ★
        </motion.h1>
        <p
          className="text-2xl sm:text-3xl mb-3 tabular-nums"
          style={{ color: 'var(--color-neon-purple)' }}
        >
          NVL {event.from}{' '}
          <span style={{ color: 'var(--color-fg-subtle)' }}>→</span>{' '}
          <span style={{ color: 'var(--color-neon-magenta)' }}>NVL {event.to}</span>
        </p>
        <p
          className="text-sm uppercase tracking-widest"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          ▸ click o esc para cerrar
        </p>
      </motion.div>
    </motion.div>
  );
}
