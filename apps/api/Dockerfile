### ─── 1. Base con pnpm ────────────────────────────────────────────
FROM node:22.11-alpine AS base
# pnpm v9 requiere PNPM_HOME definido y en PATH para instalar globales.
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /workspace

### ─── 2. Pruner: extrae solo lo necesario para apps/api ──────────
FROM base AS pruner
RUN pnpm add -g turbo@^2.3.3
COPY . .
RUN turbo prune @perdida-peso/api --docker

### ─── 3. Builder ───────────────────────────────────────────────────
FROM base AS builder
COPY --from=pruner /workspace/out/json/ .
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /workspace/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /workspace/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json
# Compilar primero los packages workspace que usa la api. Sus `main`
# apunta a `./dist/index.js`, así que Node debe encontrar los .js
# compilados en runtime (no los .ts directos).
RUN pnpm --filter "@perdida-peso/schemas" --filter "@perdida-peso/domain" --filter "@perdida-peso/api-client" build
RUN pnpm --filter @perdida-peso/api build

### ─── 4. Runtime ───────────────────────────────────────────────────
FROM node:22.11-alpine AS runner
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nestjs
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/packages ./packages

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
# Las migraciones Drizzle son ficheros .sql + meta/, no se compilan.
# Las colocamos junto al script `migrate.js` para que la ruta relativa
# desde `dist/db/migrate.js` → `dist/db/migrations/` funcione tanto al
# arrancar como en el container `api-migrate`.
COPY --from=builder /workspace/apps/api/src/db/migrations ./apps/api/dist/db/migrations

USER nestjs
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
