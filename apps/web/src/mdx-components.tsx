import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

/**
 * Estilos por defecto de los textos MDX (páginas legales en
 * `/app/legal/`). Mantiene la estética cyberpunk: tipografía vt323,
 * acentos neón, prosa ancho cómodo.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1
        {...props}
        className="text-3xl uppercase tracking-widest mb-6 mt-8 first:mt-0"
        style={{
          color: 'var(--color-neon-green)',
          fontFamily: 'var(--font-vt323)',
        }}
      />
    ),
    h2: (props) => (
      <h2
        {...props}
        className="text-2xl uppercase tracking-wider mt-8 mb-4 border-b pb-1"
        style={{
          color: 'var(--color-neon-cyan)',
          borderColor: 'var(--color-border)',
          fontFamily: 'var(--font-vt323)',
        }}
      />
    ),
    h3: (props) => (
      <h3
        {...props}
        className="text-xl uppercase tracking-wider mt-6 mb-3"
        style={{
          color: 'var(--color-neon-orange)',
          fontFamily: 'var(--font-vt323)',
        }}
      />
    ),
    p: (props) => <p {...props} className="my-3 leading-relaxed" />,
    ul: (props) => <ul {...props} className="my-3 ml-6 list-disc space-y-1" />,
    ol: (props) => <ol {...props} className="my-3 ml-6 list-decimal space-y-1" />,
    a: ({ href = '', children, ...rest }) => {
      const isExternal = /^https?:/.test(href);
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: 'var(--color-neon-cyan)' }}
            {...rest}
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href}
          className="underline"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          {children}
        </Link>
      );
    },
    strong: (props) => (
      <strong {...props} style={{ color: 'var(--color-neon-yellow)' }} />
    ),
    code: (props) => (
      <code
        {...props}
        className="px-1 py-0.5 text-sm"
        style={{
          background: 'color-mix(in oklch, var(--color-neon-cyan) 12%, transparent)',
          color: 'var(--color-neon-cyan)',
          fontFamily: 'var(--font-jetbrains)',
        }}
      />
    ),
    blockquote: (props) => (
      <blockquote
        {...props}
        className="my-4 border-l-2 pl-4 italic"
        style={{
          borderColor: 'var(--color-neon-orange)',
          color: 'var(--color-fg-muted)',
        }}
      />
    ),
    hr: (props) => (
      <hr
        {...props}
        className="my-6 border-0 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      />
    ),
    ...components,
  };
}
