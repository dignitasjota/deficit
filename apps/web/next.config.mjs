import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Linting se ejecuta aparte con `pnpm lint`. Durante `next build`
  // no queremos que la config Flat de ESLint (que requiere
  // `@eslint/eslintrc`) bloquee el build de producción.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Type-check también aparte con `pnpm typecheck`. El build de Next
  // hace su propio check que dispara `noUnusedLocals` global y rompe
  // ante imports no usados acumulados. Mantener el typecheck en CI
  // pero no en el `next build` de producción.
  typescript: {
    ignoreBuildErrors: true,
  },
  // `experimental.typedRoutes` se promocionó a top-level en Next 15.
  typedRoutes: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  transpilePackages: [
    '@perdida-peso/api-client',
    '@perdida-peso/domain',
    '@perdida-peso/schemas',
  ],
  // Webpack resuelve los re-exports `from './foo.js'` de los packages
  // workspace contra los `.ts` reales. Necesario porque el código
  // fuente de `packages/domain`, `packages/schemas` y `packages/api-client`
  // usa la convención ESM Node-style con extensión explícita.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

const withMDX = createMDX({
  // Sin remark/rehype plugins por ahora — los textos legales son
  // markdown plano. Añadir GFM, slug, autolink-headings cuando haga
  // falta tabla de contenidos o anchor links.
});

export default withMDX(nextConfig);
