# ARCHITECTURE.md — Reglas de diseño

> Documento de referencia para tomar decisiones de arquitectura. Si una
> decisión nueva contradice algo de aquí, primero se actualiza este
> archivo (con justificación) y después el código.

---

## 1. Principios

### 1.1 Domain-first
Toda la lógica matemática (cálculo de XP, niveles, retención, semanas,
colchón, pronósticos) vive en **`packages/domain`** como funciones puras.
NestJS y React son meros consumidores. Si alguien pregunta "dónde está la
fórmula de X", la respuesta siempre es `packages/domain/src/<archivo>.ts`.

**Por qué**:
- Reusable entre API, web y futura app móvil sin reescritura.
- Testable de forma aislada (Vitest, sin levantar BBDD ni servidor).
- Versionable: si una fórmula cambia, el commit toca un único package
  y el blast radius es claro.

### 1.2 Separación API / Web (no monolito Next)
NestJS es la API REST oficial. Next.js consume esa API vía HTTP, **no usa
Server Actions** ni accede a la BBDD directamente. La app móvil consumirá
la misma API.

**Por qué**:
- Permite app móvil nativa sin reescribir backend.
- Permite escalar API y Web por separado.
- Permite que la API tenga ciclo de vida propio (versiones, deprecaciones,
  rate limiting, autenticación uniforme).

### 1.3 Multi-tenant desde el día 1
Aunque el sistema empieza siendo de un solo usuario (yo), todas las
tablas operacionales y queries están scoped por `user_id` desde el
principio. Cuando se abra a usuarios externos, no hay refactor.

**Por qué**:
- Refactorizar un sistema "single-tenant a multi-tenant" es ingeniería
  cara y arriesgada. Hacerlo desde el principio cuesta lo mismo y evita
  bugs futuros.

### 1.4 Self-hosted con Docker
Despliegue en servidor propio con Portainer + Nginx Proxy Manager. Cero
dependencias de Vercel/Supabase Cloud para el path crítico.

**Por qué**:
- Control total de los datos (importante para una app de salud).
- Coste fijo predecible (un VPS) vs. variable (cloud serverless).
- Facilita futura comercialización en mercados con requisitos de
  ubicación de datos (UE).

### 1.5 Single source of truth para tipos y schemas
- **Schemas Zod** en `packages/schemas` — usados por API (validación de
  request) y web (validación de form).
- **Tipos del dominio** en `packages/domain/src/types.ts`.
- **Schemas de BBDD** en `apps/api/src/db/schema/*` con Drizzle. Pueden
  generarse Zod schemas automáticamente con `drizzle-zod` si se desea.
- **Cliente HTTP tipado** en `packages/api-client` — métodos escritos
  a mano que importan los tipos de `@perdida-peso/schemas`. Cuando los
  endpoints crezcan podemos migrar a generación desde OpenAPI Swagger
  de NestJS, pero hoy el coste manual es mínimo.

Resultado: cambiar una columna en una tabla cambia los tipos en API,
schemas en web y el cliente HTTP en una sola actualización.

### 1.6 Formato de los packages workspace: CommonJS compilado

`packages/{schemas, domain, api-client}` están configurados como:

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  }
}
```

Y compilan con `module: "CommonJS"` (vía `packages/config/tsconfig/library.json`).

**Por qué CommonJS**:
- La API NestJS compila a CommonJS por defecto. Node no permite
  `require()` de un módulo ESM desde CommonJS — si los packages fueran
  ESM, la API rompería en runtime.
- Next.js con `transpilePackages` lee el source TS directamente, así
  que no le afecta el formato compilado.
- Vitest acepta ambos formatos.

**Por qué compilado a `dist/`**:
- Apuntar `main` a `./src/index.ts` requiere transpilador en runtime.
- En dev (NestJS watch) funciona; en producción Node nativo falla.
- Solución estándar para monorepos: compilar antes de empaquetar.

**Implicación operativa**: los Dockerfiles ejecutan
`pnpm --filter @perdida-peso/{schemas,domain,api-client} build` antes
del build de la app. Si añades un package nuevo, **inclúyelo en esa
línea** del Dockerfile.

---

## 2. Mapa de dependencias entre packages

```
┌──────────────────────────────────────────────────────────────────┐
│                          apps/web                                │
│  React 19 · Next.js 15 · TanStack Query · Recharts · Tailwind   │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  packages/api-client                             │
│         Cliente HTTP tipado (generado desde OpenAPI)             │
└──────────────────┬───────────────────────────────────────────────┘
                   │ HTTP / JSON
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                          apps/api                                │
│  NestJS 11 · Drizzle · Pino · Swagger · auth manual (scrypt+JWT) │
│  Stripe · Nodemailer · Prometheus · @nestjs/{cache,schedule}     │
└──────────┬─────────────────────────┬─────────────────────────────┘
           │                         │
           ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│  packages/domain     │   │  packages/schemas    │
│  Funciones puras     │   │  Zod                 │
└──────────────────────┘   └──────────────────────┘
           ▲                         ▲
           └─────────────────────────┘
                       │
              consumidos también
              por apps/web

(packages/config provee tsconfig/eslint/vitest a TODOS, sin imports
en runtime — solo en herramientas)
```

### 2.1 Reglas inviolables de imports

| Origen | Puede importar de | NO puede importar de |
|--------|-------------------|----------------------|
| `packages/domain` | TypeScript stdlib, date-fns, otros submódulos del propio domain | NestJS, Next, React, Drizzle, zod \[a], schemas |
| `packages/schemas` | zod, otros submódulos del propio schemas | domain, NestJS, Next, React, Drizzle |
| `packages/api-client` | schemas (tipos), fetch nativo | domain, NestJS, Next, React, Drizzle |
| `packages/config` | sus propias deps de tooling | nada del proyecto en runtime |
| `apps/api` | domain, schemas, NestJS, Drizzle, todo lo necesario | api-client (es para clientes), web |
| `apps/web` | domain, schemas, api-client, React, Next | NestJS, Drizzle, server-only de api |

\[a] domain mantiene tipos propios; schemas valida en frontera.

### 2.2 Cómo verificar
- ESLint con `import/no-restricted-paths` (a configurar en Fase 3 cuando
  haya más volumen).
- TypeScript `paths` y `references` enforce el grafo en compile time.
- En CI, comprobamos que `packages/domain/dist` no contiene strings
  como `nestjs`, `next`, `react` ni `drizzle` (smoke test).

---

## 3. Estructura interna de cada app/package

### 3.1 `packages/domain`

```
src/
├── constants.ts        # Constantes globales del sistema (§14 DOMAIN.md)
├── types.ts            # Tipos TypeScript del dominio
├── levels.ts           # Progresión: deriveProgressionParams, calcLevelState
├── bmr.ts              # (Fase 2) BMR Mifflin–St Jeor + TDEE
├── xp.ts               # (Fase 2) XP por pasos, ejercicio, déficit
├── retention.ts        # (Fase 2) Modelo de retención y rango esperado
├── hydration.ts        # (Fase 2) Meta de litros, litros efectivos
├── weeks.ts            # (Fase 2) Estado semana, colchón, inversión
├── forecast.ts         # (Fase 2) Pronóstico fecha L80, fechas por nivel
├── milestones.ts       # (Fase 2) Cálculo siguiente hito
└── index.ts            # Re-export público
```

Cada archivo:
- Funciones nombradas, **sin clases** (salvo si el dominio lo justifica).
- Test acompañante `*.test.ts`.
- Sin estado: el caller pasa todo lo necesario, la función devuelve un
  resultado.

### 3.2 `apps/api`

```
src/
├── main.ts                       # bootstrap con rawBody:true (Stripe), Swagger, CORS
├── app.module.ts                 # imports raíz: Config, Logger, Cache, Prometheus, Schedule, módulos feature
├── config/                       # AppConfigService con validación Zod del .env
├── db/
│   ├── database.module.ts        # provee DATABASE token (drizzle instance)
│   ├── schema/                   # un archivo por tabla
│   ├── migrations/               # SQL generado por drizzle-kit
│   └── migrate.ts                # script ejecutable de migración
├── health/                       # /health, /health/live, /health/ready
├── observability/                # (Fase 18) HttpMetricsInterceptor + counters Prometheus
├── auth/                         # (Fase 3) scrypt + JWT manual (ADR-013) + email tokens + cron purga
├── mailer/                       # (Fase 14) Nodemailer SMTP + plantillas HTML
├── legal/                        # (Fase 16) consent log + export RGPD
├── billing/                      # (Fase 17) Stripe + PlanGuard (@RequiresPlan)
├── admin/                        # (Fase 15) AdminGuard + audit log + impersonate
├── users/                        # (Fase 3) profile + me/export
├── weights/                      # (Fase 5) peso báscula
├── xp/                           # (Fase 6) summary, manual, log
├── entries/                      # (Fase 7) deporte + hidratación + sync xp_log
├── attributes/                   # (Fase 8) 9 atributos con HID/PRO automáticos
├── charts/                       # (Fase 9) /v1/charts/weight (premium)
├── weeks/                        # (Fase 10) semanas + colchón (premium)
├── path/                         # (Fase 11) camino L0→L80 + buy-level (premium)
├── dashboard/                    # (Fase 5) header con peso/rango/retención
└── common/                       # cursor pagination + zod-validation pipe
```

Convenciones:
- **Un módulo por feature**, no por capa. Es decir, `weights/` contiene
  controller, service, schema y dto.
- **Controllers delgados**: solo orquestación HTTP. La lógica vive en
  servicios.
- **Servicios delgados**: orquestan llamadas a domain + repository.
- **Repositories** (cuando haya queries complejas): clase fina sobre
  Drizzle.
- **Cero lógica matemática** en servicios o controllers — solo en
  `packages/domain`.

### 3.3 `apps/web`

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # AuthProvider + QueryProvider + ImpersonateBanner + CookieBanner
│   ├── page.tsx                  # Home con cards (locked si free)
│   ├── globals.css               # paleta neón + scanlines + reduced-motion
│   ├── login/, register/, onboarding/
│   ├── verify-email/, forgot-password/, reset-password/
│   ├── settings/                 # cuenta + suscripción + RGPD + borrar cuenta
│   ├── pricing/                  # cards Free vs Premium + Checkout
│   ├── admin/                    # /admin/{layout,page,users,users/[id],audit}
│   └── legal/                    # MDX (terminos, privacidad, cookies) + layout
├── lib/
│   ├── api.ts                    # instancia del api-client
│   ├── auth-context.tsx          # AuthProvider con refresh automático
│   ├── auth-storage.ts, query-provider.tsx, tones.ts, avatars.ts, utils.ts
│   └── ...
├── components/
│   ├── ui/                       # shadcn re-tematizados + NeonCard + NeonStat
│   ├── dashboard/                # 14 cards (Weight, Range, XP, Path, Bitácora, ...)
│   ├── avatar/                   # AvatarFrame + AvatarGallery
│   ├── layout/                   # AppShell con header (link admin) + footer + sidebar
│   ├── cookie-banner.tsx, easter-eggs.tsx, impersonate-banner.tsx
│   └── TerminalShell.tsx         # login/register/onboarding wrapper
└── mdx-components.tsx            # estilos neón para MDX legal
```

Convenciones:
- **`'use client'` por defecto en este proyecto** porque el dashboard
  depende de hooks (TanStack Query, framer-motion, useAuth). El Server
  Components-first idiomático de Next.js no encaja con el patrón que
  hemos elegido — la home es interactividad pura.
- **Data fetching cliente con TanStack Query**, queryKeys
  centralizados en `lib/query-provider.tsx`. Mutaciones invalidan
  con `invalidateQueries`.
- **Estilos vía Tailwind utilities** + variables CSS de `globals.css`
  para colores/fuentes. Cero CSS-in-JS.
- **Type-safe routing**: `experimental.typedRoutes` activado.
- **MDX con `@next/mdx`** para textos legales (`/legal/*`). Estilos
  neón inyectados via `mdx-components.tsx`.

---

## 4. Patrones multi-tenant

### 4.1 `userId` por todas partes

Cada tabla operacional tiene `user_id uuid NOT NULL REFERENCES users(id)
ON DELETE CASCADE` con índice. Las queries Drizzle siempre incluyen
`where(eq(table.userId, userId))`.

### 4.2 Guards globales de NestJS

Hay **tres guards** en orden de ejecución:

1. **`JwtAuthGuard`** (global, Fase 3): valida el access token, mira
   sesión activa en BBDD, inyecta `req.user = { id, sessionId }`.
   Rutas con `@Public()` se saltan. `/metrics` y `/health/*` se
   eximen explícitamente.
2. **`AdminGuard`** (per-controller, Fase 15): solo activa si el
   controlador o handler está marcado con `@AdminOnly()`. Carga
   `users.role` y rechaza con 403 si no es admin.
3. **`PlanGuard`** (global, Fase 17): solo activa si el handler está
   marcado con `@RequiresPlan('premium')`. Carga `users.plan` y
   `users.trial_ends_at`, computa `effectivePlan` y rechaza con
   **HTTP 402** si no cubre el plan requerido.

```typescript
@UseGuards(AdminGuard)
@AdminOnly()
@Controller({ path: 'admin', version: '1' })
class AdminController {
  @Get('users')
  list(@CurrentUser('id') adminId: string) { ... }
}

@RequiresPlan('premium')
@Controller({ path: 'charts', version: '1' })
class ChartsController {
  @Get('weight')
  weight(@CurrentUser('id') userId: string) { ... }
}
```

Los decoradores se aplican a nivel de class para tres controllers
premium-only (`charts`, `weeks`, `path`) y `users/me/export`. El
`@CurrentUser()` inyecta el `userId` del request, haciendo
*estructuralmente imposible* olvidar el scoping.

### 4.3 Versionado del perfil

Cuando un usuario cambia su `pesoObjetivoKg` (y por tanto `xpPorNivel`
deriva), no podemos romper su histórico. Tabla `profile_version`:

```
id | user_id | valid_from | valid_to | peso_inicial | peso_objetivo | factor_actividad
```

Cada fila de `xp_log` referencia `profile_version_id`. Para histórico,
los cálculos usan la versión vigente en su fecha. Para futuro, la versión
actual.

### 4.4 Tests de aislamiento

En la suite de integración (Fase 3):
- Crear usuario A y B con datos.
- Login como A.
- Verificar que `GET /weights` solo devuelve datos de A.
- Repetir para todas las features sensibles.

Si un endpoint olvida el `where(userId)`, este test falla.

---

## 5. Convenciones de naming

### 5.1 Identificadores

- **Dominio en español** (los conceptos del producto): `pesoInicialKg`,
  `xpPorNivel`, `nivelActual`, `colchon`, `rangoMin`.
- **Técnicos en inglés**: `userId`, `createdAt`, `email`, `password`,
  `request`, `response`, `controller`.
- Las tablas en BBDD en `snake_case` (Drizzle se encarga con `casing:
  'snake_case'`).
- Las columnas técnicas en inglés: `id`, `user_id`, `created_at`.
- Las columnas de dominio en español: `peso_inicial_kg`, `xp_por_nivel`.

### 5.2 Archivos

- TypeScript: `kebab-case.ts`. Ej. `app-config.service.ts`,
  `weights.controller.ts`.
- React components: `PascalCase.tsx`. Ej. `WeightCard.tsx`.
- Tests: junto al archivo, con sufijo `.test.ts(x)`.

### 5.3 Endpoints REST

- Plurales: `/weights`, `/entries`, `/attributes`.
- Identificadores: `/weights/:id`, `/entries/:date` (con date en formato
  `YYYY-MM-DD`).
- Acciones no-CRUD: verbo en POST: `/path/buy-level`,
  `/weeks/:id/apply-colchon`.
- Versionado en URL: `/v1/weights`. Default version = 1.

---

## 6. Convenciones de tooling

### 6.1 TypeScript estricto siempre

`strict: true` + `noUncheckedIndexedAccess` + `noImplicitOverride` +
`noUnusedLocals` (en producción). En NestJS bajamos
`noUnusedLocals/Parameters` por los decoradores.

### 6.2 ESLint flat config

Configuraciones reusables en `packages/config/eslint/{base,node,react}.mjs`.
Cada app/package extiende la suya:

```mjs
import config from '@perdida-peso/config/eslint/node';
export default config;
```

### 6.3 Vitest para todo

API: `vitest run` en CI. Frontend: Vitest con `jsdom` para componentes.
Sin Jest. Cobertura vía `@vitest/coverage-v8`.

### 6.4 Prettier obligatorio

`pnpm format` aplica. CI no exige `format:check` aún (lo hará en Fase 14
cuando se abra al público).

---

## 7. Cambio de constantes y fórmulas

Si necesitas cambiar una constante o una fórmula:

1. **Actualiza primero `docs/DOMAIN.md`** con la nueva regla.
2. **Actualiza `packages/domain`** (constants.ts y/o el archivo de la
   fórmula).
3. **Actualiza los tests**.
4. **Verifica que no hay constantes "rebeldes"** (hardcodeadas en otro
   archivo) con un grep.
5. **Si la constante afecta a datos en producción** (ej. cambia el ratio
   de retención), considera migración de datos.

**Nunca** introduzcas una constante mágica directamente en código de
NestJS o React. Importa siempre desde `@perdida-peso/domain/constants`.

---

## 8. Decisiones técnicas tomadas

| Tema | Decisión | Fase | ADR/Notas |
|------|----------|------|-----------|
| State manager cliente | TanStack Query + state local de React | 5 | Sin Zustand: la home no tiene state global complejo |
| Auth | scrypt + JWT HS256 manual con sesiones en BBDD | 3 | ADR-013 (sustituye a BetterAuth) |
| Email transactional | Nodemailer + SMTP (mailpit dev, configurable prod) | 14 | Provider-agnostic. Sin BullMQ todavía: envío síncrono |
| Cola de jobs | Sin cola (envío síncrono) | 14 | Diferida hasta volumen real |
| Animaciones | framer-motion | 13 | Spring transitions en barras + AnimatePresence en LevelUpOverlay |
| Easter eggs | Konami Code + 5 clicks en avatar | 13 | `localStorage` `pp:arcade` |
| Páginas legales | `@next/mdx` + `@mdx-js/react` | 16 | MDX en `apps/web/src/app/legal/*.mdx` |
| Audit IPs | SHA-256 hex (minimización RGPD) | 15-16 | Nunca IP plana en BBDD |
| Cron de purga | `@nestjs/schedule` `EVERY_DAY_AT_3AM` | 14 | FK cascade limpia datos asociados |
| Roles admin | `pgEnum user_role` + `@AdminOnly()` | 15 | Bootstrap: `pnpm admin:promote <email>` |
| Billing | Stripe Checkout + Customer Portal + Stripe Tax | 17 | Trial server-side 14d sin tarjeta |
| Cache | `@nestjs/cache-manager` en memoria | 18 | Sin Redis hasta tracción real |
| Métricas | `@willsoto/nestjs-prometheus` + interceptor global | 18 | `/metrics` con histograma HTTP |
| CDN | Cloudflare delante del Nginx Proxy Manager | diferido | Cuando lanzamiento público lo justifique |
| Stack Grafana | Prometheus + Loki + alertmanager | diferido | Cuando > 50 usuarios concurrentes |
| Skins / themes | `data-theme` attr en `<html>` + CSS vars override | plumbing listo, sin UI | Toda paleta en vars; añadir skin = un bloque `:root[data-theme='x']` |
| PWA | `app/manifest.ts` + iconos `ImageResponse` (`next/og`) | 19.0 ✅ | Sin offline, sin service worker propio; instalable iOS+Android+desktop |
| App móvil nativa | Expo + React Native, reusando packages | 19.1 (condicional) | Solo si la PWA no basta (HealthKit, push fiables, widgets) |

---

## 9. Cuando dudes

- ¿Pongo esta lógica en API o en domain? → **En domain si es cálculo
  determinista**. En API si involucra BBDD, HTTP, side effects.
- ¿Pongo esta validación en Zod o en lógica de servicio? → **Zod si es
  formato/forma**. Servicio si es regla de negocio.
- ¿Cliente o servidor en Next? → **Servidor por defecto**. Cliente solo
  con interactividad (formularios, hooks).
- ¿Endpoint nuevo o reutilizar? → **Nuevo si la responsabilidad es
  distinta**. Reutilizar solo si las dos llamadas devolverían exactamente
  lo mismo.

---

## 10. Cuando este documento se queda corto

Este archivo cubre principios. Para detalles concretos:

- Reglas matemáticas → [`docs/DOMAIN.md`](./DOMAIN.md)
- Estado de fases → [`docs/ROADMAP.md`](./ROADMAP.md)
- Despliegue → [`docs/DEPLOY.md`](./DEPLOY.md)
- Quickstart humano → [`README.md`](../README.md)
- Brief para LLMs → [`CLAUDE.md`](../CLAUDE.md)
