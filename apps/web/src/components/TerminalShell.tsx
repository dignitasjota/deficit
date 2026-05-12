import Link from 'next/link';
import type { ReactNode } from 'react';

export function TerminalShell({
  title,
  subtitle,
  children,
  borderColor = 'var(--color-neon-green)',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  borderColor?: string;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div
        className="border-2 p-8 max-w-md w-full font-[family-name:var(--font-vt323)]"
        style={{ borderColor, boxShadow: `0 0 18px -6px ${borderColor}` }}
      >
        <h1
          className="text-3xl mb-1 neon-glow terminal-cursor"
          style={{ color: borderColor }}
        >
          ▶ {title}
        </h1>
        {subtitle && (
          <p
            className="text-xl mb-6"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            {subtitle}
          </p>
        )}
        <div className="text-xl">{children}</div>
      </div>
      <p
        className="mt-6 text-base font-[family-name:var(--font-vt323)] tracking-widest"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        SISTEMA RPG · v0.0.0 · 80 NIVELES POR DELANTE
      </p>
      <p
        className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-[family-name:var(--font-vt323)]"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        <Link
          href="/legal/terminos"
          className="underline"
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
        <Link
          href="/legal/cookies"
          className="underline"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Cookies
        </Link>
      </p>
    </main>
  );
}

export function TerminalLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="block text-xl mb-1 uppercase tracking-wide"
      style={{ color: 'var(--color-neon-cyan)' }}
    >
      {children}
    </label>
  );
}

export function TerminalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-transparent border px-3 py-2 text-xl outline-none transition-all focus:focus-neon ${props.className ?? ''}`}
      style={{
        borderColor: 'var(--color-neon-green)',
        color: 'var(--color-fg)',
        ...(props.style ?? {}),
      }}
    />
  );
}

export function TerminalSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-transparent border px-3 py-2 text-xl outline-none transition-all focus:focus-neon ${props.className ?? ''}`}
      style={{
        borderColor: 'var(--color-neon-green)',
        color: 'var(--color-fg)',
        ...(props.style ?? {}),
      }}
    />
  );
}

export function TerminalButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`w-full border-2 py-3 text-xl uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-[color:var(--color-neon-orange)]/10 hover:neon-glow-soft ${props.className ?? ''}`}
      style={{
        borderColor: 'var(--color-neon-orange)',
        color: 'var(--color-neon-orange)',
        ...(props.style ?? {}),
      }}
    >
      {loading ? '...procesando...' : children}
    </button>
  );
}

export function TerminalError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="text-xl mt-2 border px-3 py-2 anim-pulse-neon"
      style={{ color: 'var(--color-neon-red)', borderColor: 'var(--color-neon-red)' }}
    >
      ✗ {message}
    </p>
  );
}
