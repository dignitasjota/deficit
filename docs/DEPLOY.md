# DEPLOY.md — Despliegue self-hosted

> **Estado**: procedimiento aplicable al cierre de Fase 18 (producto
> SaaS-ready completo). Cubre auth, emails transaccionales, billing
> Stripe, panel admin, RGPD, observabilidad básica.
>
> **Documentos relacionados**:
> [`CLAUDE.md`](../CLAUDE.md) ·
> [`ROADMAP.md`](./ROADMAP.md) ·
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) ·
> [`DOMAIN.md`](./DOMAIN.md)

Procedimiento para levantar el stack en local o en un VPS con
**Portainer + Nginx Proxy Manager**. Todo va en Docker: no necesitas
`pnpm` ni Node instalados en el host para *ejecutar* la aplicación
(solo para desarrollo activo con hot-reload).

---

## Arquitectura de despliegue

```
                              ┌───────────────────────────────┐
                              │  Nginx Proxy Manager (TLS)    │
                              │   app.tudominio.com  →  web   │
                              │   api.tudominio.com  →  api   │
                              └─────────────┬─────────────────┘
                                            │ red "proxy"
              ┌─────────────────────────────┴──────────────────┐
              │                                                │
       ┌──────▼──────┐                                  ┌──────▼──────┐
       │  web        │      red "internal"              │  api        │
       │  Next.js    │ ◄──────────────────────────────► │  NestJS     │
       │  :3000      │                                  │  :3001      │
       └─────────────┘                                  └─────┬───────┘
                                                              │
                              ┌──────────────────┬────────────┴──┬──────────────┐
                              │                  │               │              │
                        ┌─────▼─────┐    ┌──────▼───────┐ ┌─────▼─────┐  ┌─────▼─────┐
                        │   db      │    │   mailpit    │ │   minio   │  │  api-     │
                        │ Postgres  │    │ (solo dev)   │ │  storage  │  │  migrate  │
                        │           │    │              │ │           │  │ (one-shot)│
                        └───────────┘    └──────────────┘ └───────────┘  └───────────┘
```

- En **producción** se usa Resend/SES/postal en lugar de `mailpit` (la
  API toma el SMTP de las env vars; el servicio `mailpit` puede
  quedarse o quitarse del compose, da igual).
- El servicio `api-migrate` corre una vez al levantar y termina;
  `api` espera a su éxito antes de arrancar.
- `web` y `api` están en `internal` (BBDD) y `proxy` (NPM).

---

## ⚠️ Pre-requisitos del repo (críticos)

Antes de cualquier build (local o VPS), el repo debe tener **estos
archivos commiteados**:

### `pnpm-lock.yaml` (raíz)

Sin lockfile, `turbo prune --docker` no puede aislar deps y el build
falla con "Lockfile not found". Si no existe en tu clon:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace node:22.11-alpine sh -c \
  "corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --lockfile-only"

git add pnpm-lock.yaml
git commit -m "chore: lockfile inicial"
```

### Migraciones Drizzle (`apps/api/src/db/migrations/`)

Sin SQL generado, el container `api-migrate` falla con "no migration
files found". Los SQL se generan desde el schema TS:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace node:22.11-alpine sh -c \
  "corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm db:generate"

git add apps/api/src/db/migrations/
git commit -m "feat(db): migración inicial con 17 tablas"
```

**Cuando hagas cambios al schema** (`apps/api/src/db/schema/*.ts`):

1. Re-ejecuta `pnpm db:generate` localmente.
2. Drizzle crea `0001_xxx.sql`, `0002_xxx.sql`, etc.
3. Commitea + push. El próximo deploy aplica el delta automáticamente.

### Packages workspace compilados durante el build

Los packages `packages/{schemas,domain,api-client}` apuntan a `dist/`
en su `main`. Los Dockerfiles **ya** los compilan antes de la app, no
hay nada manual que hacer. Esto está documentado por si toca un
package nuevo: añade `--filter "@perdida-peso/<nombre>"` a la línea
de build en `apps/api/Dockerfile` y `apps/web/Dockerfile`.

---

## Parte A — Ejecución en local con Docker

> Pensado para desarrollo o evaluación rápida sin instalar `pnpm`.
> Con hot-reload del código fuente necesitas `pnpm` (ver §C).

### A.1 Prerequisitos

- Docker + Docker Compose v2.
- Git.
- `pnpm-lock.yaml` y `apps/api/src/db/migrations/` deben existir en
  el repo (ver sección anterior).
- **Si Docker Hub te falla** con `DeadlineExceeded` al hacer pull:
  configurar el mirror de Google en Docker Desktop → Settings →
  Docker Engine:
  ```json
  { "registry-mirrors": ["https://mirror.gcr.io"] }
  ```
  Cloudflare R2 (donde Docker Hub guarda los blobs) está bloqueado
  por algunos ISPs. El mirror de Google los sirve desde otra CDN.

### A.2 Levantar

```bash
git clone <repo> perdida-peso && cd perdida-peso

# Variables de entorno
cp .env.example .env

# JWT_SECRET es obligatorio (mín. 32 chars)
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env

# (Opcional pero recomendado) tu email como admin automático
echo "BOOTSTRAP_ADMIN_EMAIL=tu@email.com" >> .env

# Build y arrancar (todo)
docker compose up -d --build
```

El primer build tarda 2-3 minutos (compila TS, instala deps, etc.).
Los siguientes son ~10-30s gracias al cache de capas de Docker.

**Orden de arranque** (`docker compose up` lo orquesta automáticamente):

1. `db` (Postgres) → healthcheck OK.
2. `api-migrate` ejecuta el SQL pendiente y termina (exit 0).
3. `api` y `web` arrancan en paralelo.
4. `mailpit` y `minio` están disponibles desde el principio.

Verifica:

```bash
docker compose ps
# api-migrate: Exited (0)   ← OK, terminó correctamente
# db, api, web, mailpit, minio: Up
```

Docker Compose carga **automáticamente** el `docker-compose.override.yml`
que ya viene en el repo. Eso:

- Expone puertos `3000` (web) y `3001` (api) en `127.0.0.1`.
- Configura `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- Activa Swagger y `LOG_LEVEL=debug`.

### A.3 Acceder

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |
| Métricas Prometheus | http://localhost:3001/metrics |
| Healthcheck live | http://localhost:3001/health/live |
| Mailpit (emails dev) | http://localhost:8025 |
| MinIO console | http://localhost:9001 |

### A.4 Primer uso

1. http://localhost:3000/register → crear cuenta con `BOOTSTRAP_ADMIN_EMAIL`.
2. Mailpit (`:8025`) muestra el email de verificación → click el link.
3. Completar onboarding (avatar + datos físicos).
4. `docker compose restart api` → al volver eres admin (link `▣ admin` aparece).

---

## Parte B — Despliegue en VPS con Portainer + NPM

### B.0 Prerequisitos en el VPS

- Docker + Docker Compose v2 instalados.
- Portainer operativo (acceso web).
- Nginx Proxy Manager (NPM) en otra stack, ya con SSL Let's Encrypt
  funcionando para otros dominios.
- Dos subdominios con A-records apuntando al VPS:
  - `app.tudominio.com` (frontend)
  - `api.tudominio.com` (backend)
- (Cuando vayas a abrir registros) Cuenta verificada en
  **Resend/SES/postal** (SMTP) y en **Stripe** (live).

### B.0.1 Pre-flight del repo (antes del primer push)

Verifica en local antes de hacer push del repo:

```bash
# 1. Lockfile existe
ls -la pnpm-lock.yaml   # debe pesar ~1-2 MB

# 2. Migraciones existen
ls apps/api/src/db/migrations/   # 0000_xxxx.sql, meta/

# 3. Validar que `docker compose up -d --build` arranca todo
docker compose up -d --build
docker compose ps   # api-migrate: Exited(0); resto: Up
curl http://localhost:3001/health/ready
```

**Si alguno falla en local, falla en el VPS.** Asegura el bringup
local primero, después al VPS.

### B.1 Preparar Stripe (solo si vas a monetizar)

En `https://dashboard.stripe.com/products`:

1. Crear producto **"Pérdida-Peso Premium"** con 2 precios recurrentes:
   - Mensual 4,99 € EUR. Anota `price_xxx`.
   - Anual 39,99 € EUR. Anota `price_xxx`.
2. En `https://dashboard.stripe.com/tax`: activar Stripe Tax para tu
   jurisdicción (España + UE).
3. En `https://dashboard.stripe.com/settings/billing/portal`: activar
   y configurar Customer Portal (cancelar, cambiar plan, ver facturas).
4. En `https://dashboard.stripe.com/webhooks`: **Add endpoint**
   `https://api.tudominio.com/v1/billing/webhooks` con eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Anota el **Signing secret** (`whsec_...`).

### B.2 Rellenar textos legales

Antes de pushear el repo al VPS, edita los 3 MDX con tus datos
fiscales reales y pásalos por asesoría legal:

```
apps/web/src/app/legal/terminos/page.mdx
apps/web/src/app/legal/privacidad/page.mdx
apps/web/src/app/legal/cookies/page.mdx
```

Sustituir todos los `[TU_NOMBRE_FISCAL]`, `[TU_NIF]`,
`[TU_DIRECCION_FISCAL]`, `[TU_EMAIL_DPO]`, `[FECHA_PUBLICACION]`,
`[DOMINIO_PRODUCCION]`, `[PROVEEDOR_HOSTING]`, `[PROVEEDOR_SMTP]`,
`[TU_LOCALIDAD]`.

Si subes la versión del documento, incrementa el número
correspondiente en `packages/schemas/src/legal.ts`
(`CURRENT_LEGAL_VERSIONS`) — los usuarios verán de nuevo el banner
de cookies y deberán aceptar.

Commit + push.

### B.3 Conectar la red `perdida-peso-proxy` con NPM

Para que NPM pueda enrutar tráfico a los contenedores `api` y `web`,
deben compartir red.

**Opción A — NPM en la misma red (recomendado)**:
- En el `docker-compose.yml` de NPM, declarar la red
  `perdida-peso-proxy` como `external: true`.
- Conectar el servicio `nginx-proxy-manager` a esa red.

**Opción B — Crear la red previamente**:
```bash
docker network create perdida-peso-proxy
```
Y editar `docker-compose.yml`: en el bloque `networks.proxy`, marcar
`external: true`.

### B.4 Crear el stack en Portainer

1. **Portainer → Stacks → Add stack**.
2. **Name**: `perdida-peso`.
3. **Build method**: **Repository**.
4. **Repository URL**: la URL git de tu repo.
5. **Repository reference**: `refs/heads/main`.
6. **Compose path**: `docker-compose.yml` *(importante: NO incluir el
   override, ese es solo para dev local)*.
7. **Environment variables**: pegar las que aparecen en §B.5.
8. **Deploy the stack**.

Portainer hará el primer build (3–5 minutos). Después arrancarán en
orden: `db` → `api-migrate` (corre migraciones y termina) → `api` →
`web`.

### B.5 Variables de entorno para Portainer

Configurar como **Environment variables** del stack en Portainer.
**Nunca commitear estos valores al repo**.

```bash
# ── Postgres ────────────────────────────────────────────────────
POSTGRES_USER=perdida_peso_user
POSTGRES_PASSWORD=<openssl rand -base64 32>
POSTGRES_DB=perdida_peso

# ── API ─────────────────────────────────────────────────────────
NODE_ENV=production
CORS_ORIGINS=https://app.tudominio.com
SWAGGER_ENABLED=false
LOG_LEVEL=info

# ── Auth (mínimo 32 chars) ──────────────────────────────────────
JWT_SECRET=<openssl rand -base64 48>
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=30

# ── URLs públicas ──────────────────────────────────────────────
APP_URL=https://app.tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com

# ── SMTP (Resend / SES / postal en prod) ───────────────────────
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<api-key-de-resend>
SMTP_SECURE=true
SMTP_FROM="Pérdida-Peso <hola@tudominio.com>"

# ── Soft-delete RGPD ───────────────────────────────────────────
PURGE_GRACE_DAYS=30

# ── Stripe (live) ──────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_xxx
STRIPE_TRIAL_DAYS=14

# ── Bootstrap admin (tu email) ─────────────────────────────────
BOOTSTRAP_ADMIN_EMAIL=tu@email.com

# ── MinIO ──────────────────────────────────────────────────────
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=<openssl rand -base64 32>
```

**Notas**:

- `NEXT_PUBLIC_API_URL` se inyecta en **build-time** del contenedor
  `web`. Si la cambias, hay que rebuild (Portainer → Stack → Pull and
  redeploy).
- `JWT_SECRET` distinto por entorno. Si lo rotas, todas las sesiones
  quedan invalidadas (los usuarios deberán hacer login otra vez).
- Si dejas las `STRIPE_*` vacías, los endpoints de billing devuelven
  400 pero el resto de la app funciona normal (modo "free permanente
  sin trial" si `STRIPE_TRIAL_DAYS=0`).

### B.6 Configurar Nginx Proxy Manager

Para cada subdominio, crear un **Proxy Host** con SSL Let's Encrypt:

#### `api.tudominio.com`

- **Scheme**: `http`
- **Forward Hostname / IP**: `perdida-peso-api`
- **Forward Port**: `3001`
- **Block Common Exploits**: ✅
- **Websockets Support**: ✅
- **Custom locations** (opcional, recomendado):
  - **Location**: `/metrics`
    **Forward**: mismo host:port
    **Custom Nginx Config**: `allow <IP-prometheus>; deny all;`
- **SSL** → Request a new SSL Certificate · Force SSL · HTTP/2 · HSTS

#### `app.tudominio.com`

- **Scheme**: `http`
- **Forward Hostname / IP**: `perdida-peso-web`
- **Forward Port**: `3000`
- **Block Common Exploits**: ✅
- **Websockets Support**: ✅
- **SSL** → Request a new SSL Certificate · Force SSL · HTTP/2 · HSTS

### B.7 Bootstrap del primer admin

Con `BOOTSTRAP_ADMIN_EMAIL` configurado:

1. Ve a `https://app.tudominio.com/register` y crea tu cuenta con
   **ese mismo email**.
2. Click el link del email de verificación que recibes.
3. En Portainer → Containers → `perdida-peso-api` → **Restart**.
4. Al volver, el `AuthService.onModuleInit` te promueve a admin
   (idempotente). Verás el link `▣ admin` en el header.

Si no defines `BOOTSTRAP_ADMIN_EMAIL`, hazlo manual una vez:

```bash
docker exec perdida-peso-api node /app/apps/api/dist/scripts/promote-admin.js tu@email.com
```

### B.8 Verificación post-deploy

```bash
# Liveness y readiness
curl https://api.tudominio.com/health/live    # {"status":"ok"}
curl https://api.tudominio.com/health/ready   # con info.database.status=up

# Frontend
curl -I https://app.tudominio.com             # HTTP/2 200

# (Si Stripe activo) Webhook llega
# → en Stripe Dashboard → Webhooks → "Send test event" → debería
#   responder 200 con { received: true, duplicate: false }
```

Flow E2E manual:

1. `/register` con email real → recibes email "Verifica tu email".
2. Click link → cuenta verificada.
3. Banner "TRIAL PREMIUM · 14 días" en home.
4. Completar onboarding → home con todas las cards desbloqueadas.
5. `/pricing` → suscribir mensual con tarjeta real.
6. Ver estado en `/settings`.
7. `/admin` (si eres admin) → métricas + lista usuarios + audit log.

### B.9 Updates posteriores

Cada cambio en el código que quieras desplegar:

```bash
# En local
git push origin main

# En Portainer
# → Stacks → perdida-peso → Pull and redeploy
```

Portainer hace `git pull` + `docker compose up -d --build`. Si hay
migraciones nuevas, `api-migrate` las aplica automáticamente.

**Si tocaste el schema de BBDD** (`apps/api/src/db/schema/*.ts`):

1. Local: `pnpm db:generate` (o el comando equivalente con Docker
   temporal de la §0).
2. Commit + push de los nuevos `0001_xxx.sql`, `0002_xxx.sql`, etc.
3. En el deploy, `api-migrate` aplica solo los pendientes.

**Si quieres impersonar a un usuario para soporte** desde el VPS:

1. Login como admin en `/admin/users/<id>`.
2. Click "Impersonar".
3. Te lleva a la app como ese usuario, con banner rojo permanente.
4. "Salir de impersonación" restaura tu sesión admin.

(Queda audit en `admin_audit_log` automáticamente).

---

## Parte C — Desarrollo activo con hot-reload (opcional)

Si vas a tocar código y quieres recargar al guardar (más rápido que
rebuild de contenedores), necesitas `pnpm` instalado en el host:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Solo servicios de soporte vía Docker
docker compose up -d db mailpit minio

# API y Web fuera de Docker
pnpm install
pnpm db:migrate
pnpm dev
```

Esto arranca `apps/api` (NestJS watch) y `apps/web` (Next.js dev) con
HMR. La BBDD y los servicios de soporte siguen en contenedores.

---

## Operación diaria

| Acción | Comando |
|--------|---------|
| Ver logs API | `docker compose logs -f api` |
| Ver logs Web | `docker compose logs -f web` |
| Reiniciar API | `docker compose restart api` |
| Actualizar código | Portainer → Stack → **Pull and redeploy** |
| Aplicar migraciones manualmente | `docker compose run --rm api-migrate` |
| Promover admin (sin restart) | `docker exec perdida-peso-api node /app/apps/api/dist/scripts/promote-admin.js <email>` |
| Backup BBDD | `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%F).sql` |
| Restaurar BBDD | `cat backup.sql \| docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB` |
| Drizzle Studio (GUI) | local: `pnpm db:studio` con `DATABASE_URL` apuntando al VPS por túnel SSH |
| Inspeccionar métricas | `curl https://api.tudominio.com/metrics` (si NPM no la bloquea) |
| Reenviar webhook Stripe | Stripe Dashboard → Webhooks → "Send test event" |

---

## Troubleshooting

### Build (docker compose up)

**`docker pull` falla con `DeadlineExceeded` después de 250s**
Bloqueo de Cloudflare R2 desde tu ISP/red. Docker Hub guarda los
blobs en `*.r2.cloudflarestorage.com`. Solución: añadir mirror de
Google a Docker Desktop:
```json
{ "registry-mirrors": ["https://mirror.gcr.io"] }
```
Apply & Restart, luego `docker pull node:22.11-alpine`.

**`turbo prune` falla con `Lockfile not found at /workspace/pnpm-lock.yaml`**
El repo no tiene `pnpm-lock.yaml`. Generar (sin instalar pnpm):
```bash
docker run --rm -v "$PWD":/workspace -w /workspace node:22.11-alpine sh -c \
  "corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --lockfile-only"
```
Commitear el lockfile.

**`pnpm add -g turbo` falla con `ERR_PNPM_NO_GLOBAL_BIN_DIR`**
Los Dockerfiles necesitan `PNPM_HOME` en `ENV` antes de `pnpm`. Ya
está incluido en los `Dockerfile` del repo desde el bringup inicial.

**`api-migrate` falla con `no migration files found` o `Can't find meta/_journal.json`**
No has generado las migraciones SQL. Ejecuta:
```bash
docker run --rm -v "$PWD":/workspace -w /workspace node:22.11-alpine sh -c \
  "corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm db:generate"
```
Si la carpeta `apps/api/src/db/migrations/meta/` existe pero vacía,
crear `_journal.json` mínimo (`{"version":"7","dialect":"postgresql","entries":[]}`)
antes de re-ejecutar.

**`Cannot find module '/app/packages/schemas/src/common.js'` en runtime**
Los packages workspace deben compilarse a `dist/` antes que la API.
Los Dockerfiles ya lo hacen (`pnpm --filter @perdida-peso/{schemas,domain,api-client} build`).
Si añades un package nuevo, recuerda incluirlo en esa línea.

**`Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported`**
Algún package workspace tiene `"type": "module"` en su `package.json`.
Los packages deben ser CommonJS (sin `"type": "module"`) para que
NestJS (CJS) pueda hacer `require()`.

**`class-validator package is missing`**
El `main.ts` está registrando `ValidationPipe` de NestJS que requiere
`class-validator`. No usamos esa lib (validamos con Zod). Quitar el
`app.useGlobalPipes(new ValidationPipe(...))` del `main.ts`.

**`JWT_SECRET es obligatorio (min 32 chars)` al arrancar**
Has olvidado definir `JWT_SECRET` en las env vars del stack. Genera
con `openssl rand -base64 48` y reintenta deploy.

**`api-migrate` falla con `relation already exists`**
Drizzle es idempotente; revisa `drizzle.__migrations` en la BBDD. Si
la tabla de migraciones está corrupta, restaura backup.

**`api-migrate` queda en `Created` y nunca arranca**
Está esperando que `db` pase healthcheck. Mirar `docker compose logs
db` — habitualmente es un tema de credenciales (POSTGRES_PASSWORD
distinto en el container `db` que en `DATABASE_URL`).

**`ECONNREFUSED` al acceder a la API desde la web**
`web` no resuelve `api` por DNS. Verifica que ambos están en la red
`internal` y que `NEXT_PUBLIC_API_URL` apunta a la URL pública
(https, no `http://api:3001`).

**SSL no se emite en NPM**
Subdominio aún no resuelve al servidor (DNS no propagado) o puerto 80
bloqueado. Probar `dig +short app.tudominio.com` y
`curl -I http://app.tudominio.com`.

**API responde 502 desde NPM**
Contenedor caído o no en la red proxy. Revisar `docker compose ps` y
`docker network inspect perdida-peso-proxy`. El contenedor `api`
debe aparecer en la lista.

**Webhook Stripe responde "Firma inválida"**
- `STRIPE_WEBHOOK_SECRET` distinto al del endpoint configurado en
  Stripe Dashboard.
- La API no recibe el rawBody. Verificar que `main.ts` arranca con
  `NestFactory.create(AppModule, { rawBody: true })` (sí lo hace
  desde Fase 17).
- En NPM, asegurar que el proxy host **no** modifica el body para
  esa ruta (sin transforms ni cache headers).

**Email no llega**
- Revisar logs API: `docker compose logs api | grep -i mailer`.
- Verificar SMTP_* en env vars. Probar primero con Mailpit local
  para descartar problema en el código.
- En producción, comprobar que el dominio está verificado en el
  proveedor SMTP (SPF + DKIM en tu DNS).

**`/v1/charts/weight` devuelve 402 inesperadamente**
Plan = `free` y trial expirado. Verifica en Drizzle Studio:
`SELECT plan, trial_ends_at FROM users WHERE email = ...`. Si la sub
debería estar activa, revisar `subscriptions.status` y los webhooks
recibidos en `billing_events`.

**`BOOTSTRAP_ADMIN_EMAIL` no me promueve**
Ese email debe **ya existir** en la BBDD (registrado vía
`/register`) cuando arranca la API. El log mostrará
`BOOTSTRAP_ADMIN_EMAIL=... pero el usuario aún no se ha registrado`.
Regístrate primero y reinicia el container `api`.

---

## Backups (a configurar manualmente)

Hasta tener cron automatizado de `pg_dump`, hacer backups manuales
antes de cualquier despliegue significativo:

```bash
# Snapshot diario simple (añadir al cron del host)
0 3 * * * docker compose -f /opt/perdida-peso/docker-compose.yml \
  exec -T db pg_dump -U $POSTGRES_USER $POSTGRES_DB \
  | gzip > /opt/backups/perdida-peso-$(date +\%F).sql.gz
```

Para producción seria, subir los `.sql.gz` a Backblaze B2 / Cloudflare
R2 con `rclone`. Pendiente formalizar como sidecar del stack.

---

## Operación a escala (diferida hasta tracción real)

Cuando llegues a > 50 usuarios concurrentes, considerar:

- **Redis** para cache compartido entre múltiples instancias API.
- **PgBouncer** para connection pooling.
- **Réplica de lectura** Postgres.
- **Stack Grafana + Loki + alertmanager** para observabilidad visual
  y alertas. Las métricas Prometheus ya están expuestas en `/metrics`.
- **Cloudflare** delante del NPM como CDN + WAF.

Mientras tanto, los healthchecks granulares (`/health/{live,ready}`)
y el cache en memoria de `AdminService.getMetrics` cubren el día a
día con un solo nodo.
