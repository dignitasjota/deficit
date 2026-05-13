# CLAUDE.md — Contexto del proyecto para asistentes IA

> **Léeme primero.** Este archivo está pensado para que cualquier LLM
> (Claude Code, Cursor, Copilot, agentes de pull request, etc.) entienda
> el alcance del proyecto, en qué fase está, y qué reglas seguir antes
> de tocar código.

---

## 1. Qué es este proyecto

Aplicación web (con app móvil nativa a futuro) de **gestión de pérdida de
peso con gamificación profunda estilo RPG**, inspirada en el sistema
creado por Rubén Loan. El usuario gana XP por mantener déficit calórico
y hábitos saludables, sube de nivel, gana atributos (Fuerza, Vitalidad,
Destreza, Intelecto, Creatividad, Espíritu, Carisma, Hidratación,
Productividad), acumula un "colchón" de XP y avanza por un camino L0→L80
con hitos personalizables.

La estética visual es **cyberpunk/retro**: terminal oscura, tipografías
pixel/píxel, paleta neón (verde, naranja, cian, azul, morado, rosa,
rojo, amarillo), avatar pixel-art, scanlines, y gráficas con bandas
sombreadas y radar charts.

Visión a largo plazo: **SaaS multiusuario con suscripción de pago**. La
arquitectura ya está pensada para ello desde el día uno.

Las imágenes de referencia del sistema original viven en `imagenes/` (8
capturas que muestran cabecera del dashboard, gráfica de evolución,
atributos, formularios, tabla de semanas, camino al destino, registro de
atributos y bitácora).

---

## 2. Estado actual (resumen rápido)

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
| 13 | Pulido visual (MVP completo) | ✅ Cerrada |
| 14 | Emails transaccionales | ✅ Cerrada |
| 15 | Panel admin | ✅ Cerrada |
| 16 | Legal y cumplimiento (RGPD + LOPDGDD) | ✅ Cerrada |
| 17 | Suscripción y billing (Stripe, Free vs Premium, trial 14d) | ✅ Cerrada |
| 18 | Operación a escala (alcance mínimo: health, cache, prometheus) | ✅ Cerrada |
| 19.0 | PWA básica (instalable iOS+Android+desktop) | ✅ Cerrada |
| 19.1 | App móvil nativa (React Native + Expo) | 🟦 Condicional (tracción del producto web) |

Tracker completo y detallado: [`docs/ROADMAP.md`](./docs/ROADMAP.md).

### Lo que ya existe en el repo

- Monorepo `pnpm` workspaces + Turborepo configurado.
- `apps/api` — NestJS 11 con:
  - `/health` (verifica conexión a Postgres) y Swagger en `/docs`.
  - **Auth manual** (`/v1/auth/register|login|refresh|logout|me`) con
    scrypt + JWT HS256 + sesiones en BBDD. Guard global con decorador
    `@CurrentUser()`. Rutas `@Public()` para login/register/refresh/health.
  - Módulo `users` con `GET/PUT /v1/users/me/profile` y versionado
    automático (`profile_version`). `PUT /v1/users/me/avatar`.
  - Módulo `weights` con `GET/PUT/DELETE /v1/weights` (idempotente
    por fecha).
  - Módulo `dashboard` con `GET /v1/dashboard/header`: junta peso del
    día, media 7d, peso teórico (xpTotal/7700), retención, rango
    esperado y badge DENTRO/FUERA del rango. Calculado con funciones
    puras de `packages/domain`.
  - Módulo `xp` con `GET /v1/xp/summary` (xpTotal, nivelActual,
    xpEnNivel, próximo hito, hitos completos con flag `alcanzado`,
    stats: xpHoy/Media/Semana, BMR real con último peso, racha) y
    `POST /v1/xp/manual` (entrada tipo `M` en bitácora).
  - Módulo `entries` (Fase 7) con `GET/PUT /v1/entries/:date` y
    `GET/POST/DELETE /v1/entries/:date/exercise/:id`. Cada mutación
    abre transacción Drizzle, hace upsert del `daily_entry` y
    **recalcula xp_log de tipos P/C/L** (reescribe, no duplica) +
    sincroniza atributos `HID` (al cumplir/dejar de cumplir meta
    hidratación) y `PRO` (cuando se actualiza productividad).
  - Módulo `attributes` (Fase 8) con `GET /v1/attributes` (lista de
    9 con valor, modo y alcanzadoHoy) y
    `POST /v1/attributes/:code/increment`. HID rechaza (es AUTO),
    PRO requiere `value 0..3` y delega a `EntriesService.upsert`,
    resto +1 si no hay del día.
  - Módulo `charts` (Fase 9) con `GET /v1/charts/weight?range=7d|30d|90d|all`.
    Construye serie temporal día a día con `peso_real`, `media_7d`
    (móvil con ventana 7), `peso_teorico` (peso_inicial − xp_acum/7700),
    `rango_min`/`rango_max` (con sodio del día). Carga xp_log completo
    para xp_acumulado correcto en cada punto. Stats min/max/delta del
    rango filtrado.
  - Módulo `weeks` (Fase 10) con `GET /v1/weeks` (lista cronológica
    DESC con xp_total, estado, colchón recibido/invertido + `colchonTotal`
    + ratio `semanasOk/semanasTotales`) y
    `POST /v1/weeks/:id/apply-colchon` (compensa una semana DEFICIT).
    **Materialización on-demand**: al pedir el endpoint, las semanas
    terminadas que aún no tienen fila se materializan (calcula xpTotal
    del rango lun-dom, decide MAS_XP/DEFICIT, inserta). La semana en
    curso se calcula al vuelo sin materializar. **Conectado con
    XpSummary**: `stats.colchon` ahora refleja el cálculo real
    (`SUM(recibido) − SUM(invertido) − SUM(level_purchases.xp_invertida)`).
  - Módulo `path` (Fase 11) con `GET /v1/path/destination` y
    `POST /v1/path/buy-level`. Calcula `nivelActual = naturales +
    comprados` (cap 80), construye lista cronológica de niveles
    conseguidos (cruces de XP + compras) y proyecta los pendientes con
    `forecastLevelDates`. Compra valida colchón ≥ xpPorNivel y NIVEL <
    80, inserta fila en `level_purchases` (tabla nueva con UNIQUE
    user_id+nivel). El nivelActual de XpSummary también suma comprados.
  - **Observabilidad** (Fase 18, alcance mínimo): healthchecks
    granulares en `/health/{live,ready}` para probes K8s/Docker.
    `CacheModule` (`@nestjs/cache-manager` v3 + `cache-manager` v6)
    en memoria, TTL default 60s; aplicado a `AdminService.getMetrics`
    (cache key `admin:metrics`, TTL 30s) — el endpoint más pesado.
    `PrometheusModule` (`@willsoto/nestjs-prometheus` v6) expone
    `/metrics` con default metrics + histogram custom
    `pp_http_request_duration_seconds{method,route,status}` via
    `HttpMetricsInterceptor` global. Counters preparados
    `pp_signups_total`, `pp_logins_total{result}`. `JwtAuthGuard`
    exceptúa `/metrics` y `/health/*`. Diferidos hasta tracción
    real: Redis, PgBouncer, réplica lectura, stack Grafana, alertas.
  - **Billing / Stripe** (Fase 17): columnas `users.{plan,
    stripe_customer_id, trial_ends_at}`. Tablas nuevas
    `subscriptions` y `billing_events` (UNIQUE en `stripe_event_id`
    → idempotencia automática vía `onConflictDoNothing`).
    `BillingService` con Stripe SDK lazy. Endpoints
    `GET /v1/billing/me`, `POST /v1/billing/{checkout, portal}`
    (auth) y `POST /v1/billing/webhooks` (público con signature
    verificada via `Stripe.webhooks.constructEvent`). `main.ts`
    arranca con `rawBody: true` para que el webhook reciba el Buffer
    crudo. Decorador `@RequiresPlan('premium')` + `PlanGuard` aplica
    HTTP 402 a `ChartsController`, `WeeksController`,
    `PathController` y `GET /v1/users/me/export`. `register` set
    `trial_ends_at = now + STRIPE_TRIAL_DAYS`. `getMe` calcula
    `effectivePlan` (`premium` si trial activo o plan='premium').
    Stripe Tax `automatic_tax: { enabled: true }` en Checkout.
  - **Panel admin** (Fase 15): columna `users.role` (`pgEnum
    user_role`) + `users.suspended_at`. Tabla `admin_audit_log`
    (audit trail inmutable con `ip_hash` SHA-256). Decorador
    `@AdminOnly()` + `AdminGuard` cargan `users.role` solo en rutas
    marcadas. Endpoints: `GET /v1/admin/metrics` (KPIs),
    `GET /v1/admin/users?q=&cursor=&limit=`,
    `GET /v1/admin/users/:id`,
    `POST /v1/admin/users/:id/{suspend,restore,impersonate}`,
    `GET /v1/admin/audit?cursor=&limit=`. Login bloquea cuentas con
    `suspended_at`. Impersonate crea sesión del target, **rechaza
    impersonar a otros admin**, audita. Script
    `pnpm --filter @perdida-peso/api admin:promote <email>` para
    bootstrap del primer admin.
  - **Legal / RGPD** (Fase 16): tabla `consent_log` (audit trail
    inmutable). `ConsentService.accept` hashea IP con SHA-256
    (minimización RGPD). Endpoints `POST /v1/consents` y
    `GET /v1/consents/me`. `ExportService.buildExport` con
    `Promise.all` de 12 tablas, **excluye** `passwordHash` y
    `tokenHash`s. `GET /v1/users/me/export` con
    `Content-Disposition: attachment` + `Cache-Control: no-store`.
    `CURRENT_LEGAL_VERSIONS` en `packages/schemas/src/legal.ts`
    permite invalidar consents al subir versión.
  - **Skins visuales** (plumbing, feature Premium futura): columna
    `users.theme_preference` (`pgEnum user_theme`, default
    `'cyberpunk'`). Endpoint `PUT /v1/users/me/theme`. `me` incluye
    `themePreference`. Componente cliente `ThemeApplier`
    (`apps/web/src/lib/theme.tsx`) aplica `<html data-theme="...">` al
    cargar la sesión. `globals.css` documenta el patrón para añadir
    skins nuevas (`:root[data-theme='kawaii'] { ... }`). Detalle en
    `docs/DOMAIN.md` §16.7.
  - **Email transaccional** (Fase 14): `MailerService` con Nodemailer
    + SMTP (Mailpit en dev, configurable en prod). Plantillas HTML
    inline coherentes con el theme en `mailer/templates.ts`.
    `EmailTokensService` con `issue`/`consume` atómicos via UPDATE
    con WHERE; tokens se almacenan como SHA-256 hex (nunca en plano).
    Endpoints `POST /v1/auth/{verify-email, resend-verification,
    request-password-reset, reset-password, delete-account}`.
    `register` dispara email de verificación fire-and-forget.
    `delete-account` marca `deleted_at` + `purge_scheduled_at = now+30d`,
    revoca sesiones, envía email. `PurgeService` con
    `@nestjs/schedule` corre cada día 3am: borra users con
    `purge_scheduled_at <= now()` (cascada FK), limpia tokens
    caducados > 7d. Tabla nueva `email_tokens` (UNIQUE token_hash).
    Columna nueva `users.purge_scheduled_at` con índice.
  - **Logs paginados** (Fase 12): `GET /v1/xp/log` y
    `GET /v1/attributes/log?atributo=` con cursor opaco
    (base64url codificando `{ createdAt, id }`). Helper
    `apps/api/src/common/cursor.ts` (`encodeCursor` / `decodeCursor`).
    Tuple comparison `(created_at, id) < (cursor)` para evitar
    duplicados con timestamps idénticos. `limit + 1` para detectar
    `hasMore`. Total via `COUNT(*)::int`. Filtro de atributo
    declarado **antes** del `:code/increment` para evitar colisión
    de rutas.
  - Drizzle conectado con todas las tablas operacionales. Migraciones
    en `apps/api/src/db/migrations/` (regenerar con
    `pnpm db:generate`).
- `apps/web` — Next.js 15 + React 19 + Tailwind 4 con:
  - `AuthProvider` (`src/lib/auth-context.tsx`) con `ApiClient` singleton
    y persistencia de tokens en localStorage.
  - Páginas `/login`, `/register`, `/onboarding` (wizard 2 pasos:
    avatar + datos), `/` (dashboard con `AppShell`, sidebar de avatar +
    stats, columna derecha con cards y placeholders por fase).
  - **shadcn/ui** inicializado: `Button`, `Input`, `Label`, `Progress`,
    `Badge`, `Separator`, `Dialog`, `Select` (con Radix UI).
  - **TanStack Query** con `QueryProvider` global. Claves centralizadas
    en `lib/query-provider.tsx`. staleTime 30s, refetchOnWindowFocus.
  - Componente `NeonCard` reutilizable con título tipo terminal y borde
    de color, `PlaceholderCard` para fases futuras, `NeonStat` para
    valores estilo HUD.
  - **`WeightCard`** con báscula/media/teórico + Dialog para actualizar
    peso de hoy + botón borrar. Optimistic updates con TanStack Query.
  - **`RangeCard`** con rango min-max, badge DENTRO/FUERA, desglose de
    retención (Sodio/Glucógeno/Digestivo) y media vs baseline.
  - **`ExperienceCard`** con barra amarilla shimmer, porcentaje grande
    centrado, footer "SIG. NIVEL X XP (~Xd)".
  - **`NextMilestoneCard`** roja con nombre del hito + nivel + XP que
    falta. Caso especial "JEFE FINAL SUPERADO" en L80.
  - **`LevelPathCard`** con barra L0→L80 segmentada en 80 celdas
    (alcanzadas en morado neón con shimmer, pendientes en gris) y
    porcentaje recorrido superpuesto.
  - Sidebar STATS con BMR calculado en backend usando el último peso
    báscula del usuario.
  - **`DeporteCard`** (Fase 7) con form de pasos (XP en vivo
    cliente-side con `calcStepXP`), tabs Ejercicio/Caminata, lista
    de ejercicios añadidos con XP por sesión y botón delete.
  - **`HidratacionCard`** (Fase 7) con barra `litros_efectivos / meta`,
    badge "META CUMPLIDA ✓", input sodio (g/mg switch), 3 tarjetas de
    bebidas (Agua 100%, Café/té 90%, Zero 70%) con quick-buttons +0.33
    +0.5 +1 +1.5L y botón resetear.
  - **`AttributesCard`** (Fase 8) con 9 filas (código + barra
    coloreada + valor + acción según modo): MANUAL → modal con
    descripción, AUTO_HIDRATACION → badge "AUTO", AUTO_PRODUCTIVIDAD
    → modal con 4 niveles 0..3.
  - **`AttributesRadar`** (Fase 8) con `RadarChart` de Recharts, 9
    ejes coloreados, escala max 15/20/25/30+ que se reajusta al
    valor más alto.
  - **`WeightChartCard`** (Fase 9) con `ComposedChart` de Recharts:
    banda gris translúcida del rango esperado (`<Area>` con dataKey
    `[rangoMin, rangoMax]`), peso real (naranja con puntos), media
    7d (cian sólida), peso teórico (verde dashed). Filtros 7/30/90/
    Todo, header MIN/MAX/Δ, leyenda inferior y tooltip neón.
  - **`WeeksCard`** (Fase 10) con tabla cronológica DESC: rango
    lun-dom · barra bicolor (naranja propio + cian colchón
    invertido) · `xp/7700` · estado `EN_CURSO/COMPENSADA/+XP/DEFICIT`.
    Header con `COLCHÓN +XXX` y `X/Y OK`. Click en DEFICIT abre
    Dialog con resumen (faltan X XP, colchón disponible Y) y botón
    para invertir.
  - **`PathCard`** (Fase 11) con header LLEGADA EST., 4 KPIs (nivel
    actual, destino L80, restantes, compradas), barra grande L0→L80
    con marker AQUÍ, dos listas paralelas (POR VENIR con fechas
    estimadas + CONSEGUIDOS con etiqueta NATURAL/COMPRADA, scroll
    vertical) y footer "FUNDIR X XP DEL COLCHÓN PARA ADELANTAR 1
    SEMANA" + botón COMPRAR 1 SEMANA con Dialog de confirmación.
  - **`BitacoraCard`** (Fase 12) con `useInfiniteQuery` +
    `IntersectionObserver` (rootMargin 160px). Filas grid con tipo
    `[P/C/L/H/A/M]` coloreado, fecha `dd/mm`, descripción truncada y
    XP. XP positivo en color del tipo, negativo en rojo neón.
  - **`RegistroAtributosCard`** (Fase 12) con tabs filtro
    `TODO/FUE/VIT/.../HID/PRO`. El filtro forma parte de la
    `queryKey`, así cambiar de filtro reinicia la paginación. Cada
    chip con borde y fondo `color-mix` del color del atributo.
  - **Animaciones (Fase 13)**: `framer-motion` añade transiciones
    spring a todas las barras (Experience, LevelPath, Hidratación,
    Weeks, Path, Attributes). `LevelUpOverlay` detecta subidas de
    nivel via hook `useLevelUp` (persistencia en localStorage por
    usuario) y muestra overlay neón fullscreen con `AnimatePresence`,
    auto-dismiss 3.5 s, click/Esc para cerrar.
  - **Easter eggs (Fase 13)**: `EasterEggsListener` global escucha
    el Konami Code (↑↑↓↓←→←→BA) y hace toggle de la clase
    `arcade-mode` en `<html>` (satura paleta + scanlines más
    intensos). Wrapper `FiveClickEasterEgg` envuelve el avatar del
    sidebar y muestra un toast oculto a los 5 clicks.
  - **Billing UI (Fase 17)**: `/pricing` con toggle mensual/anual y
    botón → Stripe Checkout. Sección "SUSCRIPCIÓN" en `/settings`
    con plan efectivo, días trial restantes y botón Customer Portal.
    `TrialBanner` en home (cyan durante trial, orange post-trial).
    `PremiumLockedCard` sustituye HidratacionCard, WeightChartCard,
    WeeksCard y PathCard cuando `me.effectivePlan === 'free'`. Cliente
    HTTP: `getMyBilling`, `createCheckout`, `createPortalSession`.
  - **Panel admin (Fase 15)**: rutas `/admin`, `/admin/users`,
    `/admin/users/[id]`, `/admin/audit` bajo `/admin/layout.tsx`
    con guard cliente que redirige si `me.role !== 'admin'`.
    Búsqueda debounced (300ms) + `useInfiniteQuery` en lista.
    `ImpersonateBanner` global rojo persiste tokens del admin en
    `localStorage` `pp:impersonate-prev` para poder revertir;
    "Salir" hace logout del target y restaura. Link "▣ admin" en
    header del `AppShell` si `me.role === 'admin'`.
  - **Páginas legales (Fase 16)**: MDX en `apps/web/src/app/legal/`
    (`terminos/page.mdx`, `privacidad/page.mdx`, `cookies/page.mdx`)
    con plantilla RGPD + LOPDGDD para España. `mdx-components.tsx`
    aplica estilos neón a headers/code/links. `CookieBanner` global
    compara versión local vs `CURRENT_LEGAL_VERSIONS`. Botón
    "Descargar mis datos" en `/settings`. Footer en `AppShell` y en
    `TerminalShell` con links legales.
  - **PWA básica**: `app/manifest.ts` genera `/manifest.webmanifest`
    con `display: standalone`, theme/background neón, categorías
    health/fitness. Iconos generados dinámicamente con `ImageResponse`
    de `next/og` (sin necesidad de PNGs estáticos en build):
    `app/icon.tsx` (32x32 favicon), `app/apple-icon.tsx` (180x180),
    `app/icon-192/route.tsx` y `app/icon-512/route.tsx` (maskable con
    safe-zone 60% para que el SO los recorte en círculo/squircle sin
    perder el glyph Δ). SVG master vectorial en
    `/public/icons/icon-master.svg`. Meta tags iOS via
    `metadata.appleWebApp` (capable, status-bar black-translucent,
    title 'Déficit'). El usuario puede instalar como app desde
    Safari/Chrome móvil → icono en home screen, modo standalone sin
    barra del navegador, splash screen automático. Sin offline (es
    SaaS conectado).
  - **A11y / responsive (Fase 13)**: `prefers-reduced-motion` en
    `globals.css`, skip-link en `AppShell`, `viewport.themeColor`
    + `colorScheme: dark` en metadata, header del shell con email
    oculto en `< md` y logout solo-icono en `< sm`, grids de filas
    de WeeksCard/BitacoraCard/RegistroAtributosCard reducidos en
    móvil.
  - `lib/tones.ts` central con `TONE_VAR` y `toneVar(code)` para
    mapear `'red'/'green'/...` a variables CSS (reutilizado por
    NeonCard, AttributesCard, AvatarFrame, etc.).
  - Componente `DateNav` reutilizable (◀ fecha ▶) para navegar a días
    pasados. Cap a hoy.
  - **Galería de 6 avatares pixel-art SVG** en `/public/avatars/`
    (`warrior`, `mage`, `rogue`, `cleric`, `ranger`, `monk`).
  - Componente `AvatarFrame` con marco neón y leyendas tipo HUD.
  - `globals.css` con paleta neón completa, scanlines + vignette CRT,
    cursor parpadeante, animaciones (`neon-shimmer`, `neon-pulse`,
    `glitch`), utilities `neon-glow`, `focus-neon`, `pixelated`.
- `packages/domain` — todas las funciones puras del modelo
  implementadas y testeadas (≥ 80 % cobertura objetivo): progresión
  (`deriveProgressionParams`, `calcLevelState`), BMR/TDEE
  (`calcBMR`, `calcTDEE`), XP (`calcStepXP`, `calcExerciseXP`,
  `calcDeficitXP`), hidratación (`calcHydrationGoal`,
  `calcEffectiveLitros`, `metaHidratacionCumplida`), retención
  (`calcRetention`, `calcExpectedRange`, `calcTheoreticalWeight`,
  `calcMovingAverage`, `calcBaselineDrift`), semanas (`calcWeekStatus`,
  `applyColchonToWeek`), pronósticos (`forecastDestination`,
  `forecastLevelDates`), hitos (`calcMilestoneState`,
  `HITOS_POR_DEFECTO`).
- `packages/schemas` — Zod schemas básicos (user, common). Se ampliará
  en cada fase.
- `packages/api-client` — cliente HTTP con métodos para todos los
  endpoints (auth, billing, admin, legal, etc.). Tipos importados
  de `@perdida-peso/schemas`. Refresh automático ante 401.
- `packages/config` — tsconfig, ESLint flat config, Vitest reusables.
- `docker-compose.yml` con `db` (Postgres 16), **`api-migrate`**
  (one-shot que aplica migraciones Drizzle y termina), `api`, `web`,
  `minio` y `mailpit`. La `api` espera a `api-migrate:
  service_completed_successfully` → migraciones automáticas al
  levantar.
- `docker-compose.override.yml` (solo dev, auto-cargado): expone
  puertos 3000/3001 en localhost y configura `NEXT_PUBLIC_API_URL`
  para local.
- `BOOTSTRAP_ADMIN_EMAIL` env: si está definida, el `AuthService`
  promueve ese email a admin al arrancar (idempotente). Útil en
  Portainer para evitar pasos manuales.
- Dockerfiles multi-stage con Turbo prune para imágenes mínimas.
  El de la API copia `src/db/migrations/` al stage final para que
  el script de migrate los encuentre en runtime.
- CI GitHub Actions: lint, typecheck, test, build de imágenes en `main`.

### Lo que NO existe todavía

- **App móvil nativa** (Fase 19.1, condicional según tracción del
  web). La PWA básica (Fase 19.0) ya cubre el caso "instalar como
  app en el móvil" desde Safari/Chrome.
- **Service worker / offline / push notifications**: la PWA actual
  es sin service worker. Sin offline ni push hasta que haya demanda.
- **Stack pesado de operación a escala** diferido hasta > 50
  usuarios concurrentes: Redis cache compartido, PgBouncer, réplica
  de lectura Postgres, Grafana + Loki + alertmanager, alertas
  Telegram/email, CDN externo. Lo que sí existe: healthchecks
  granulares, cache en memoria y métricas Prometheus en `/metrics`.
- **Counters de negocio instrumentados** (`pp_signups_total`,
  `pp_logins_total`): los providers están registrados, pero
  `AuthService` no los incrementa todavía (decisión consciente; el
  histograma HTTP ya cubre signup/login con label `route` y
  `status`).

---

## 3. Stack tecnológico (resumen)

```
Monorepo:        pnpm workspaces + Turborepo
Lenguaje:        TypeScript 5.7 estricto
API:             NestJS 11 + Drizzle ORM + Zod + Pino + Swagger
Web:             Next.js 15 (App Router) + React 19 + Tailwind 4 + shadcn/ui (Radix) + framer-motion
MDX legal:       @next/mdx + @mdx-js/react (páginas /legal/*)
Auth:            Manual scrypt + JWT HS256 (ver ADR-013) — consumible por web y móvil
DB:              PostgreSQL 16
Storage:         MinIO (S3-compatible self-hosted) para avatares y CSVs
Email:           Nodemailer + SMTP (dev: mailpit; prod: Resend / SES / postal)
Cron:            @nestjs/schedule (purga 30d, limpieza de tokens)
Billing:         Stripe SDK (Checkout + Customer Portal + Stripe Tax)
Cache:           @nestjs/cache-manager + cache-manager (memoria, sin Redis)
Métricas:        @willsoto/nestjs-prometheus + prom-client (/metrics)
Charts:          Recharts (banda sombreada del rango esperado + radar)
Animaciones:     framer-motion (barras, level-up overlay)
Tests:           Vitest (dominio + integración con Postgres real)
Despliegue:      Docker Compose self-hosted + Portainer + Nginx Proxy Manager
Móvil:           Expo + React Native (Fase 19, condicional)
```

Más detalle de **por qué cada elección**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 4. Estructura del repo

```
perdida-peso/
├── apps/
│   ├── api/                          # NestJS 11
│   │   ├── src/
│   │   │   ├── main.ts               # bootstrap con rawBody:true (webhook Stripe)
│   │   │   ├── app.module.ts
│   │   │   ├── admin/                # AdminGuard, AdminService, audit log
│   │   │   ├── attributes/           # módulo atributos (9 con HID/PRO auto)
│   │   │   ├── auth/                 # scrypt + JWT + email tokens + purge cron
│   │   │   ├── billing/              # Stripe + PlanGuard (@RequiresPlan)
│   │   │   ├── charts/               # /v1/charts/weight (premium)
│   │   │   ├── common/               # cursor pagination + zod pipe
│   │   │   ├── config/               # AppConfigService con validación Zod
│   │   │   ├── dashboard/            # /v1/dashboard/header
│   │   │   ├── db/                   # Drizzle: schema/, migrations/, migrate.ts
│   │   │   ├── entries/              # daily_entry + ejercicios + sync xp_log
│   │   │   ├── health/               # /health, /health/live, /health/ready
│   │   │   ├── legal/                # consent log + export RGPD
│   │   │   ├── mailer/               # Nodemailer + plantillas HTML
│   │   │   ├── observability/        # Prometheus interceptor + counters
│   │   │   ├── path/                 # camino L0→L80 + buy-level (premium)
│   │   │   ├── users/                # perfil + me/export
│   │   │   ├── weeks/                # semanas y colchón (premium)
│   │   │   ├── weights/              # peso báscula
│   │   │   └── xp/                   # /v1/xp/{summary, manual, log}
│   │   ├── scripts/                  # promote-admin.ts
│   │   ├── tests/                    # 14 archivos de tests integración
│   │   ├── Dockerfile                # Multi-stage con turbo prune
│   │   └── drizzle.config.ts
│   └── web/                          # Next.js 15 + React 19 + Tailwind 4
│       ├── src/
│       │   ├── app/
│       │   │   ├── admin/            # /admin/{layout,page,users,audit}
│       │   │   ├── legal/            # MDX (terminos, privacidad, cookies)
│       │   │   ├── pricing/          # cards Free vs Premium + Checkout
│       │   │   ├── settings/         # cuenta + suscripción + RGPD + borrar
│       │   │   ├── verify-email/, forgot-password/, reset-password/
│       │   │   ├── layout.tsx        # ImpersonateBanner + CookieBanner global
│       │   │   ├── page.tsx          # Home con todas las cards + locked
│       │   │   └── globals.css       # paleta neón + scanlines + reduced-motion
│       │   ├── components/
│       │   │   ├── dashboard/        # 14 cards (Weight, Range, XP, Path, ...)
│       │   │   ├── ui/               # shadcn/ui + NeonCard + NeonStat
│       │   │   ├── avatar/           # AvatarFrame + AvatarGallery
│       │   │   ├── layout/           # AppShell con header + footer + sidebar
│       │   │   ├── cookie-banner.tsx, easter-eggs.tsx, impersonate-banner.tsx
│       │   │   └── TerminalShell.tsx
│       │   ├── lib/                  # api, auth-context, query-provider, tones, avatars
│       │   └── mdx-components.tsx    # estilos neón para MDX legal
│       └── Dockerfile
│
├── packages/
│   ├── domain/                       # Lógica matemática pura — cero deps de framework
│   │   └── src/                      # 10 módulos: levels, bmr, xp, hydration,
│   │                                 # retention, weeks, forecast, milestones, etc.
│   ├── schemas/                      # Zod schemas compartidos (auth, admin, billing,
│   │                                 # legal, log, etc.)
│   ├── api-client/                   # Cliente HTTP con refresh automático
│   └── config/                       # Configs reusables (tsconfig, eslint, vitest)
│
├── docs/
│   ├── DOMAIN.md                     # Modelo de dominio + §16 Free vs Premium
│   ├── ROADMAP.md                    # Tracker de las 19 fases
│   ├── ARCHITECTURE.md               # Reglas de diseño y deps entre packages
│   └── DEPLOY.md                     # Procedimiento self-hosted
│
├── imagenes/                         # 8 capturas del sistema original (referencia)
├── docker-compose.yml                # producción: db, api-migrate, api, web, minio, mailpit
├── docker-compose.override.yml       # dev: expone puertos 3000/3001 + API_URL local
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## 5. Reglas críticas (lee antes de tocar código)

### 5.1 Aislamiento de capas

```
packages/domain
   ↑    ↑
   │    └─ apps/api importa
   └─ apps/web importa (vía bundler, transpilePackages)

packages/schemas ← apps/api, apps/web, packages/api-client

packages/api-client ← apps/web (y futura apps/mobile)

apps/api → BBDD vía Drizzle
apps/web → API vía packages/api-client
```

**Reglas inviolables:**

1. **`packages/domain` NO importa nada de NestJS, Next, React, Drizzle ni
   ningún framework**. Solo TypeScript y librerías matemáticas puras
   (date-fns máximo). Esto garantiza que la lógica funciona en API, web
   y móvil sin reescribirse.
2. **`packages/schemas` NO importa de domain ni de framework alguno**.
   Solo Zod. Es la capa de contratos.
3. **`apps/web` NO accede a la BBDD directamente**. Siempre vía
   `packages/api-client`.
4. **`apps/api` NO usa Server Actions de Next**. Es un API REST puro,
   consumible por web y futura móvil.
5. **Toda lógica de cálculo vive en `packages/domain`** y se testea con
   Vitest. NestJS y React son meros consumidores.

### 5.2 Multi-tenant desde el día 1

Aunque ahora sea un solo usuario (yo), el sistema está pensado para
múltiples usuarios:

1. **Toda tabla operacional debe llevar `user_id NOT NULL`** con índice.
2. **Toda query Drizzle debe estar scoped por `user_id`**. NestJS tendrá
   un guard global (Fase 3) que extrae `user_id` del JWT y obliga a
   pasarlo. Tests específicos verifican que el usuario A no puede leer
   datos del B.
3. **Constantes globales del dominio** (las de `packages/domain/src/constants.ts`)
   son idénticas para todos los usuarios.
4. **Datos derivados del perfil** (`xpPorNivel`, `kgPorNivel`, etc.) se
   calculan por usuario y se versionan en `profile_version` cuando el
   usuario cambia su objetivo (Fase 3).

### 5.3 Modelo de dominio = fuente única de verdad

[`docs/DOMAIN.md`](./docs/DOMAIN.md) contiene **todas** las fórmulas,
constantes y reglas del sistema. Cualquier cambio en el cálculo se hace:

1. Primero en `DOMAIN.md`.
2. Después en `packages/domain`.
3. Con tests que validan el cambio.

**Nunca hardcodear constantes en código fuera de `packages/domain`**.
Importar siempre desde `@perdida-peso/domain`.

### 5.4 Idioma y estilo

- **Idioma**: español. Identificadores de código en español o inglés
  según contexto (los identificadores del dominio en español:
  `pesoInicialKg`, `xpPorNivel`, `nivelActual`; los técnicos genéricos en
  inglés: `userId`, `createdAt`, `email`).
- **Comentarios en código**: por defecto **no escribir comentarios**.
  Solo cuando expliquen un *por qué* no obvio (constraint oculto,
  invariante sutil, workaround para un bug). Nunca describir el *qué*:
  los nombres de funciones e identificadores ya lo hacen.
- **NUNCA escribir comentarios que se refieran a "esta fase" o "el
  cambio de esta tarea"**. Esos comentarios envejecen mal.

### 5.5 Cambios fuera del alcance de la fase actual

Si alguna petición pide funcionalidad de fases futuras, **avisar antes
de implementar**. Ej: si estamos en Fase 2 y se pide construir el panel
de atributos (Fase 8), no improvisar — preguntar si saltamos fase o
acotamos al alcance actual.

### 5.6 Ejecutar acciones con cuidado

- Cambios destructivos (drop tables, force-push, rm -rf, override de
  archivos sin leer): **siempre confirmar antes**.
- Backups antes de migraciones grandes.
- No hacer commits si el usuario no lo ha pedido explícitamente.

### 5.7 Reglas operacionales del monorepo (aprendidas en bringup)

Tras la primera sesión de "hacer arrancar el código" salió a la luz
deuda acumulada. Estas reglas evitan repetirla:

1. **Packages workspace son CommonJS, compilados a `dist/`**.
   `packages/{schemas, domain, api-client}` tienen `main: "./dist/index.js"`
   y NO `"type": "module"`. Sus tsconfig heredan `library.json` que
   compila a `module: "CommonJS"`. La razón: NestJS (CJS) hace
   `require()` de ellos en runtime y Node no permite cargar ESM desde
   CJS. En dev funciona porque NestJS watch transpila; en runtime
   produccion **debe** ser CJS.

2. **El Dockerfile compila packages workspace antes de la app**.
   `apps/api/Dockerfile` y `apps/web/Dockerfile` ejecutan
   `pnpm --filter @perdida-peso/{schemas,domain,api-client} build`
   **antes** del build de la app. Si añades un package nuevo, hay que
   incluirlo en esa línea.

3. **`pnpm-lock.yaml` siempre commiteado**. Sin lockfile,
   `turbo prune --docker` no aísla deps. Generar (sin instalar pnpm)
   con: `docker run --rm -v "$PWD":/workspace -w /workspace node:22.11-alpine sh -c "corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --lockfile-only"`.

4. **Migraciones Drizzle siempre commiteadas**. Generadas con
   `pnpm db:generate`. El primer journal vacío (`meta/_journal.json`
   con `entries: []`) puede tener que crearse a mano la primera vez.
   El Dockerfile API copia `src/db/migrations/` al `dist/db/migrations/`
   para que `migrate.js` los encuentre en runtime.

5. **Imports entre archivos de `apps/api/src/db/schema/` SIN `.js`**.
   drizzle-kit usa `require()` sin transpilación ESM-aware y falla
   con extensiones literales. Otros sitios pueden usar `.js` porque
   los compila NestJS (CJS resuelve `.js → .ts`).

6. **Augmentation de tipos Express**: usar `declare global namespace Express`,
   no `declare module 'express-serve-static-core'`. pnpm strict mode
   aísla ese subpath y rompe el build.

7. **Webpack de Next**: `extensionAlias: { '.js': ['.ts', '.tsx', ...] }`
   en `next.config.mjs` para que resuelva imports con `.js` en los
   packages workspace cuando los lee desde source con `transpilePackages`.

8. **MDX no soporta autolinks `<https://...>`** (interpreta `<` como
   JSX). Usar formato Markdown explícito: `[texto](url)`.

9. **No usar `ValidationPipe` global de NestJS**. Toda la validación
   de input se hace con `ZodValidationPipe` por endpoint. Activar el
   `ValidationPipe` global requeriría `class-validator` +
   `class-transformer` que no están instalados.

10. **`import.meta` NO en código de la API**. NestJS compila con
    `module: CommonJS` que no soporta `import.meta`. Usar `__dirname`
    directamente para resolver paths (ej. `migrate.ts`).

---

## 6. Convenciones de código

### Nombres de archivos
- TypeScript: `kebab-case.ts` (ej. `app-config.service.ts`).
- Tests: `*.test.ts` junto al archivo que prueban.
- React components: `PascalCase.tsx`.

### Imports
- Imports absolutos con alias `@/` dentro de cada app/package.
- Imports entre packages: `@perdida-peso/<package>`.
- Type imports: usar `import { type Foo }` o `import type { Foo }`.

### Tests
- Vitest, no Jest.
- Tests de dominio en `packages/domain` con cobertura ≥ 80%.
- Tests de integración API con Supertest contra Postgres real (no mocks).

### Validación
- Zod en frontera (entrada de API, lectura de env, lectura de form).
- Una sola fuente de schemas: `packages/schemas` y derivados con
  `drizzle-zod` para schemas de DB.

### Logs
- Pino estructurado en API. Nunca loguear PII (emails, tokens,
  passwords). El redact ya está configurado para `Authorization` y
  `Cookie`.

---

## 7. Comandos esenciales

### Ejecución completa con Docker (sin pnpm)

```bash
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env
echo "BOOTSTRAP_ADMIN_EMAIL=tu@email.com" >> .env    # opcional, te promueve a admin

docker compose up -d --build   # levanta TODO: db, api-migrate (one-shot),
                               # api, web, mailpit, minio
docker compose logs -f api
docker compose restart api     # tras crearte cuenta, te aplica el bootstrap admin
docker compose down            # parar (BBDD persiste en volumen)
```

Compose carga automáticamente `docker-compose.override.yml` en dev:
expone puertos `3000`/`3001` en `localhost` y configura el frontend
para hablar con la API local. **En Portainer/VPS, especificar
`Compose path: docker-compose.yml`** para que ignore el override.

### Desarrollo con hot-reload (con pnpm)

```bash
pnpm install              # instalar todo el monorepo
docker compose up -d db mailpit minio   # solo soporte en Docker
pnpm db:migrate           # aplica migraciones
pnpm dev                  # arranca api y web en paralelo con HMR

pnpm build                # build de producción
pnpm test                 # tests vitest
pnpm lint                 # lint
pnpm typecheck            # solo type-check sin emitir
pnpm format               # prettier --write

# Base de datos (desde la raíz, delega a apps/api)
pnpm db:generate          # genera migración a partir del schema
pnpm db:migrate           # aplica migraciones
pnpm db:studio            # abre Drizzle Studio (GUI)

# Bootstrap admin manual (alternativa a BOOTSTRAP_ADMIN_EMAIL)
pnpm --filter @perdida-peso/api admin:promote <email>

# Stripe (Fase 17, dev)
stripe listen --forward-to localhost:3001/v1/billing/webhooks
```

### Observabilidad (Fase 18)

```bash
curl http://localhost:3001/health/live    # liveness probe (sin deps)
curl http://localhost:3001/health/ready   # readiness probe (con BBDD)
curl http://localhost:3001/metrics        # métricas Prometheus
```

---

## 8. Documentación complementaria

| Archivo | Propósito |
|---------|-----------|
| [`docs/DOMAIN.md`](./docs/DOMAIN.md) | **Modelo de dominio**: fórmulas (BMR, XP, niveles, retención), constantes, reglas. Fuente única de verdad. |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Tracker de fases con estado actual y próximos pasos. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Reglas de diseño, dependencias entre packages, patrones multi-tenant. |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Procedimiento de despliegue self-hosted con Portainer + NPM. |
| [`README.md`](./README.md) | Quickstart para humanos. |

---

## 9. Mantenimiento de este archivo

`CLAUDE.md`, `docs/ROADMAP.md` y los headers de estado en `DOMAIN.md` /
`DEPLOY.md` deben actualizarse al cierre de cada fase. La regla:

- Al terminar una fase → marcarla ✅ en `ROADMAP.md` y `CLAUDE.md` §2.
- Al cambiar una decisión de dominio → actualizar `DOMAIN.md` antes que
  el código.
- Al añadir un servicio o cambiar una dependencia transversal →
  actualizar `ARCHITECTURE.md`.

Si una sesión de trabajo cierra una fase, el último paso de esa sesión
es actualizar estos archivos.
