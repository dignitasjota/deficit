### ─── 1. Base con pnpm ────────────────────────────────────────────
FROM node:22.11-alpine AS base
# pnpm v9 requiere PNPM_HOME definido y en PATH para instalar globales.
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /workspace

### ─── 2. Pruner ───────────────────────────────────────────────────
FROM base AS pruner
RUN pnpm add -g turbo@^2.3.3
COPY . .
RUN turbo prune @perdida-peso/web --docker

### ─── 3. Builder ───────────────────────────────────────────────────
FROM base AS builder
COPY --from=pruner /workspace/out/json/ .
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /workspace/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /workspace/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

# Compilar packages workspace primero (sus `main` apunta a `dist/`).
RUN pnpm --filter "@perdida-peso/schemas" --filter "@perdida-peso/domain" --filter "@perdida-peso/api-client" build
RUN pnpm --filter @perdida-peso/web build

### ─── 4. Runtime ───────────────────────────────────────────────────
FROM node:22.11-alpine AS runner
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nextjs
WORKDIR /app

ENV NODE_ENV=production

# Output standalone de Next.js incluye solo lo imprescindible
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
