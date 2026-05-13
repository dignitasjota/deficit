# Pérdida de peso — Sistema RPG

Aplicación web (con app móvil nativa a futuro) de gestión de pérdida de
peso con gamificación profunda estilo RPG, inspirada en el sistema
creado por Rubén Loan. Estética cyberpunk/retro: avatar pixel-art,
paleta neón, gráficas con bandas sombreadas, atributos estilo rol y
radar charts.

> **¿Eres un asistente IA leyendo este repo?** Empieza por
> [`CLAUDE.md`](./CLAUDE.md) — tiene el contexto completo, reglas y
> estado actual del proyecto.

---

## Estado actual

| Fase | Nombre | Estado |
|------|--------|--------|
| 0 | Modelo de dominio | ✅ Cerrada |
| 1 | Setup técnico (monorepo, Docker, CI) | ✅ Cerrada |
| 2 | Núcleo matemático en `packages/domain` | ✅ Cerrada |
| 3 | Modelo de datos y autenticación | ✅ Cerrada |
| 4 | Theme cyberpunk y layout principal | ✅ Cerrada |
| 5 | Pesos diarios y dashboard de cabecera | ✅ Cerrada |
| 6 | Sistema de XP, niveles y barras | ✅ Cerrada |
| 7 | Entradas diarias (deporte e hidratación) | ✅ Cerrada |
| 8 | Atributos y radar | ✅ Cerrada |
| 9 | Gráfica de evolución de peso | ✅ Cerrada |
| 10 | Semanas y colchón | ✅ Cerrada |
| 11 | Camino al destino (compra de niveles) | ✅ Cerrada |
| 12 | Bitácora y Registro de Atributos | ✅ Cerrada |
| 13 | Pulido visual y cierre del MVP | ✅ Cerrada |
| 14 | Emails transaccionales (verify, reset, soft-delete) | ✅ Cerrada |
| 15 | Panel admin (métricas, gestión usuarios, audit log) | ✅ Cerrada |
| 16 | Legal y cumplimiento (RGPD) | ✅ Cerrada |
| 17 | Suscripción y billing (Stripe + Premium 4,99 €/mes) | ✅ Cerrada |
| 18 | Operación a escala (mínimo: health, cache, prometheus) | ✅ Cerrada |
| 19.0 | PWA básica (instalable iOS+Android+desktop) | ✅ Cerrada |
| 19.1 | App móvil nativa (React Native + Expo) | 🟦 Condicional |
| 20 | Landing pública + SEO base (sitemap, robots, OG) | ✅ Cerrada |

**Producto SaaS-ready con observabilidad básica + landing pública**.
**Progreso global**: 20 de 20 fases cerradas (Fase 19.1 móvil nativa
condicional). Tracker detallado en
[`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API**: NestJS 11 + Drizzle ORM + PostgreSQL 16 + Pino + Swagger
- **Web**: Next.js 15 + React 19 + Tailwind 4 + shadcn/ui + framer-motion
- **MDX legal**: `@next/mdx` para `/legal/*`
- **Auth**: scrypt + JWT HS256 manual con sesiones en BBDD (ver
  [ADR-013](./docs/ROADMAP.md))
- **Email**: Nodemailer + SMTP (mailpit dev, configurable prod)
- **Billing**: Stripe SDK (Checkout + Customer Portal + Stripe Tax)
- **Cron**: `@nestjs/schedule` (purga 30d, limpieza tokens)
- **Cache**: `@nestjs/cache-manager` en memoria (sin Redis)
- **Métricas**: `@willsoto/nestjs-prometheus` con `/metrics`
- **Charts**: Recharts (banda sombreada y radar)
- **Storage**: MinIO (S3-compatible) self-hosted
- **Tests**: Vitest (dominio + integración con Postgres real)
- **Mobile** (Fase 19, condicional): Expo + React Native
- **Despliegue**: Docker Compose + Portainer + Nginx Proxy Manager

Detalle de las decisiones técnicas en
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Estructura

```
perdida-peso/
├── apps/
│   ├── api/                  # NestJS — API REST
│   └── web/                  # Next.js — UI cyberpunk
├── packages/
│   ├── domain/               # Lógica matemática pura (BMR, XP, niveles, …)
│   ├── schemas/              # Zod schemas compartidos
│   ├── api-client/           # Cliente HTTP (consumido por web y futura mobile)
│   └── config/               # tsconfig, eslint, vitest reusables
├── docs/
│   ├── DOMAIN.md             # Modelo de dominio: fórmulas, reglas, constantes
│   ├── ROADMAP.md            # Plan de fases con estado actual
│   ├── ARCHITECTURE.md       # Reglas de diseño y dependencias
│   └── DEPLOY.md             # Procedimiento de despliegue self-hosted
├── imagenes/                 # Capturas del sistema original (referencia visual)
├── docker-compose.yml        # db, api, web, minio, mailpit
└── CLAUDE.md                 # Contexto del proyecto para asistentes IA
```

---

## Requisitos

- **Docker** + **Docker Compose v2** (suficiente para ejecutar la app
  completa).
- **Node.js** ≥ 22.11.0 + **pnpm** ≥ 9.15.0 (solo si vas a desarrollar
  con hot-reload).

---

## Quickstart (solo Docker, sin pnpm)

```bash
# 1. Clonar y configurar
git clone <repo> perdida-peso && cd perdida-peso
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env

# (Opcional) tu email como admin automático
echo "BOOTSTRAP_ADMIN_EMAIL=tu@email.com" >> .env

# 2. Levantar TODO
docker compose up -d --build
```

Docker Compose carga automáticamente el `docker-compose.override.yml`
que viene en el repo: expone puertos 3000/3001 en `localhost`, activa
Swagger y configura el frontend para hablar con la API local. El
servicio `api-migrate` aplica las migraciones Drizzle antes de
arrancar `api`. **Sin pasos manuales adicionales** (siempre que el
repo tenga `pnpm-lock.yaml` y `apps/api/src/db/migrations/0000_*.sql`
commiteados — ver [`docs/DEPLOY.md`](./docs/DEPLOY.md) §Pre-requisitos
si no es tu caso).

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API + Swagger | http://localhost:3001/docs |
| Métricas Prometheus | http://localhost:3001/metrics |
| Mailpit (emails dev) | http://localhost:8025 |
| MinIO console | http://localhost:9001 |

### Primer uso

1. `http://localhost:3000/register` con el mismo email que pusiste en
   `BOOTSTRAP_ADMIN_EMAIL`.
2. Mailpit (`http://localhost:8025`) muestra el email de verificación
   → click el link.
3. Completar onboarding (avatar + datos físicos).
4. `docker compose restart api` → al volver eres admin (verás el link
   `▣ admin` en el header).

### Desarrollo con hot-reload (opcional)

Si vas a tocar código y prefieres reload al guardar en lugar de
rebuild del contenedor:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install

# Solo servicios de soporte en Docker
docker compose up -d db mailpit minio

# API y Web fuera de Docker con HMR
pnpm db:migrate
pnpm dev
```

---

## Despliegue en VPS con Portainer

Resumen del flow (detalle completo en
[`docs/DEPLOY.md`](./docs/DEPLOY.md)):

1. **Prerequisitos en el VPS**: Docker, Portainer, Nginx Proxy Manager
   con SSL Let's Encrypt operativo. DNS de `app.tudominio.com` y
   `api.tudominio.com` apuntando al VPS.
2. **(Si vas a monetizar)** Crear productos + precios + webhook en
   Stripe Dashboard. Activar Stripe Tax + Customer Portal.
3. **Rellenar placeholders legales** en los 3 MDX de
   `apps/web/src/app/legal/` con tus datos fiscales.
4. **Crear red proxy** o compartirla con NPM (ver §B.3 del DEPLOY).
5. **En Portainer**: Add stack → Repository → `docker-compose.yml`
   (NO el override, ese es para dev local).
6. **Pegar variables de entorno** del bloque §B.5 del DEPLOY,
   incluyendo `JWT_SECRET`, `STRIPE_*`, `SMTP_*` reales y
   `BOOTSTRAP_ADMIN_EMAIL=tu@email.com`.
7. **Deploy**. El stack se levanta solo: `db` → `api-migrate` (corre
   migraciones) → `api` → `web`.
8. **NPM**: dos proxy hosts (`api.tudominio.com` → `perdida-peso-api:3001`
   y `app.tudominio.com` → `perdida-peso-web:3000`) con SSL.
9. `https://app.tudominio.com/register` con tu email → recibes
   email → verificas.
10. **Portainer → Container `perdida-peso-api` → Restart**. Al volver
    eres admin automáticamente (`BOOTSTRAP_ADMIN_EMAIL`).

Updates posteriores: `git push` + Portainer → Stack → **Pull and
redeploy**. Cero comandos manuales.

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Arranca API y Web en modo dev (Turbo en paralelo) |
| `pnpm build` | Build de producción |
| `pnpm test` | Tests unitarios con Vitest |
| `pnpm lint` | Linter |
| `pnpm typecheck` | Solo type-check |
| `pnpm format` | Aplica Prettier |
| `pnpm db:generate` | Genera migración Drizzle |
| `pnpm db:migrate` | Aplica migraciones |
| `pnpm db:studio` | Abre Drizzle Studio |
| `pnpm --filter @perdida-peso/api admin:promote <email>` | Bootstrap del primer admin |
| `stripe listen --forward-to localhost:3001/v1/billing/webhooks` | Webhooks Stripe en local |

---

## Documentación

| Archivo | Para qué |
|---------|----------|
| [`CLAUDE.md`](./CLAUDE.md) | Contexto y reglas para asistentes IA |
| [`docs/DOMAIN.md`](./docs/DOMAIN.md) | Modelo de dominio: fórmulas, constantes, reglas |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Tracker de fases con estado |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Reglas de diseño y dependencias |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Despliegue en producción |

---

## Licencia

Privado. Todos los derechos reservados.
