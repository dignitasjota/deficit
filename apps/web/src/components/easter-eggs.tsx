'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const KONAMI_SEQUENCE: ReadonlyArray<string> = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const ARCADE_KEY = 'pp:arcade';

/**
 * Listener global montado en RootLayout. Escucha el Konami Code
 * (↑↑↓↓←→←→BA) y hace toggle de la clase `arcade-mode` en <html>.
 * Persiste en localStorage para sobrevivir recargas.
 *
 * Muestra un toast neón al activar/desactivar.
 */
export function EasterEggsListener() {
  const [arcade, setArcade] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(ARCADE_KEY) === '1';
    setArcade(stored);
    document.documentElement.classList.toggle('arcade-mode', stored);
  }, []);

  useEffect(() => {
    let buffer: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer = [...buffer, key].slice(-KONAMI_SEQUENCE.length);
      if (
        buffer.length === KONAMI_SEQUENCE.length &&
        buffer.every((k, i) => k === KONAMI_SEQUENCE[i])
      ) {
        setArcade((prev) => {
          const next = !prev;
          window.localStorage.setItem(ARCADE_KEY, next ? '1' : '0');
          document.documentElement.classList.toggle('arcade-mode', next);
          setToast(next ? '☀ MODO ARCADE ACTIVADO' : '✦ MODO NORMAL');
          return next;
        });
        buffer = [];
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          className="fixed top-6 left-1/2 z-[60] -translate-x-1/2 px-4 py-2 border font-[family-name:var(--font-vt323)] text-xl uppercase tracking-widest pointer-events-none"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          style={{
            color: arcade ? 'var(--color-neon-magenta)' : 'var(--color-neon-cyan)',
            borderColor: arcade ? 'var(--color-neon-magenta)' : 'var(--color-neon-cyan)',
            background: 'color-mix(in oklch, var(--color-bg) 90%, transparent)',
            boxShadow: `0 0 14px -2px ${
              arcade ? 'var(--color-neon-magenta)' : 'var(--color-neon-cyan)'
            }`,
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Wrapper que detecta 5 clicks consecutivos sobre su contenido y dispara
 * un toast easter-egg. Pensado para envolver el AvatarFrame del sidebar.
 *
 * El contador se resetea si pasa más de 1.5s entre clicks.
 */
export function FiveClickEasterEgg({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (count === 0) return;
    const t = window.setTimeout(() => setCount(0), 1500);
    return () => window.clearTimeout(t);
  }, [count]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div
        onClick={() => {
          setCount((c) => {
            const next = c + 1;
            if (next >= 5) {
              setToast('▣ "no te rindas, sigue con el déficit"');
              return 0;
            }
            return next;
          });
        }}
        className="cursor-pointer"
      >
        {children}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-4 py-2 border font-[family-name:var(--font-vt323)] text-lg pointer-events-none"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              color: 'var(--color-neon-orange)',
              borderColor: 'var(--color-neon-orange)',
              background: 'color-mix(in oklch, var(--color-bg) 90%, transparent)',
              boxShadow: '0 0 14px -2px var(--color-neon-orange)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
