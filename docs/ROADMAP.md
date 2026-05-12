# ROADMAP.md — Plan de fases y estado de desarrollo

> Tracker oficial del proyecto. Se actualiza al cierre de cada fase.
> Última actualización: tras cierre de Fase 18.

## Leyenda de estado

- ✅ **Cerrada** — entregables completados, validados y mergeados
- 🟡 **En curso** — fase actualmente activa
- 🔜 **Próxima** — siguiente en el orden, lista para arrancar
- ⬜ **Pendiente** — pendiente, sin trabajo iniciado
- 🟦 **Opcional/condicional** — depende de un disparador externo

---

## Resumen ejecutivo

| Bloque | Fases | Estado global |
|--------|-------|---------------|
| **Bases del proyecto** | 0–2 | ✅ 3 de 3 cerradas |
| **Datos y auth** | 3 | ✅ Cerrada |
| **Theme y layout** | 4 | ✅ Cerrada |
| **Cabecera del dashboard** | 5 | ✅ Cerrada |
| **Sistema de XP** | 6 | ✅ Cerrada |
| **Entradas diarias** | 7 | ✅ Cerrada |
| **Atributos y radar** | 8 | ✅ Cerrada |
| **Gráfica de evolución** | 9 | ✅ Cerrada |
| **Semanas y colchón** | 10 | ✅ Cerrada |
| **Camino al destino** | 11 | ✅ Cerrada |
| **Bitácora y registro** | 12 | ✅ Cerrada |
| **Pulido visual** | 13 | ✅ Cerrada (MVP completo) |
| **Emails transaccionales** | 14 | ✅ Cerrada |
| **Panel admin** | 15 | ✅ Cerrada |
| **Legal y RGPD** | 16 | ✅ Cerrada |
| **Suscripción y billing** | 17 | ✅ Cerrada |
| **Operación a escala (mín.)** | 18 | ✅ Cerrada |
| **App móvil** | 19 | 🟦 Condicional (tracción del producto web) |

Total: **19 de 19 fases cerradas** (Fase 19 móvil queda condicional
hasta que haya tracción real del producto web).

---

## Fase 0 — Modelo de dominio ✅ CERRADA

**Objetivo**: cerrar las reglas matemáticas y constantes del sistema antes
de tocar código.

**Entregables**:
- [x] `docs/DOMAIN.md` con todas las fórmulas, constantes y reglas
- [x] Decisiones cerradas (BMR, atributos, retención, hitos, etc.)
- [x] Versionado de perfil definido (multi-tenant ready)

**Decisiones clave tomadas**:
- BMR: Mifflin–St Jeor
- `xpPorNivel = (objetivoKg / 80) × 7700` (escala con el objetivo)
- Meta semanal fija: 7700 XP/semana
- 9 atributos cerrados (FUE, VIT, DES, INT, CRE, ESP, CAR, HID, PRO)
- Multiplicadores de bebidas: agua 1.0, café/té 0.9, refresco zero 0.7,
  alcohol 0
- Retención: solo sodio como input del usuario; glucógeno y digestivo
  son constantes
- 9 hitos genéricos por defecto (L5, L10, L20, L30, L40, L50, L60, L70, L80)
- Sin import CSV, solo español al inicio

---

## Fase 1 — Setup técnico ✅ CERRADA

**Objetivo**: monorepo desplegable con servicios mínimos verificables.

**Entregables**:
- [x] Monorepo pnpm workspaces + Turborepo
- [x] Configs raíz: TypeScript estricto, ESLint flat, Prettier, Vitest,
      .gitignore, .nvmrc, .npmrc
- [x] `packages/config` con tsconfig/eslint/vitest reusables
- [x] `packages/domain` con primer skeleton + tests
- [x] `packages/schemas` con primer skeleton
- [x] `packages/api-client` con cliente HTTP básico
- [x] `apps/api` NestJS 11 con `/health`, Swagger, Drizzle, Pino,
      validación de env con Zod
- [x] `apps/web` Next.js 15 + Tailwind 4 con página de status que
      consulta la API
- [x] Dockerfiles multi-stage con Turbo prune
- [x] `docker-compose.yml` con db, api, web, minio, mailpit
- [x] CI GitHub Actions: lint, typecheck, test, build de imágenes
- [x] `docs/DEPLOY.md`

**Pendiente (acción del usuario, no bloqueante para Fase 2)**:
- [ ] Ejecutar `pnpm install` y verificar que el setup arranca
- [ ] Desplegar primera versión en el servidor del usuario

---

## Fase 2 — Núcleo matemático ✅ CERRADA

**Objetivo**: completar `packages/domain` con todas las funciones puras
descritas en `DOMAIN.md`, testeadas con casos típicos y casos límite.

**Entregables**:
- [x] `calcBMR(profile)` — Mifflin–St Jeor (§3.1) · `bmr.ts`
- [x] `calcTDEE(bmr, factor)` — TDEE con factor de actividad (§3.2) · `bmr.ts`
- [x] `calcStepXP(pasos, peso)` — XP por pasos con tope 25k (§5.2) · `xp.ts`
- [x] `calcExerciseXP(kcal)` — XP por ejercicio con factor 0.7 (§5.3) · `xp.ts`
- [x] `calcDeficitXP(tdee, kcalIn)` — XP por déficit (§5.1) · `xp.ts`
- [x] `calcHydrationGoal(sodioG)` — meta dinámica de litros (§7.1) · `hydration.ts`
- [x] `calcEffectiveLitros(bebidas[])` — litros efectivos (§7.2) · `hydration.ts`
- [x] `aggregateByTipo(bebidas[])` — desglose por tipo · `hydration.ts`
- [x] `metaHidratacionCumplida(...)` — boolean para auto-incremento HID · `hydration.ts`
- [x] `calcRetention(sodioG)` — retención (sodio + glucógeno + digestivo, §8) · `retention.ts`
- [x] `calcExpectedRange(...)` — banda min/max (§8.3) · `retention.ts`
- [x] `evaluarPesoEnRango(...)` — `DENTRO/FUERA_ARRIBA/FUERA_ABAJO` · `retention.ts`
- [x] `calcTheoreticalWeight(...)` — peso teórico (§9.1) · `retention.ts`
- [x] `calcMovingAverage(pesos[], n)` — media móvil (§9.2) · `retention.ts`
- [x] `calcBaselineDrift(...)` — drift signed informativo (§8.4) · `retention.ts`
- [x] `calcWeekStatus(...)` — estado semana (§10.2) · `weeks.ts`
- [x] `applyColchonToWeek(...)` — invertir colchón (§10.3) · `weeks.ts`
- [x] `forecastDestination(...)` — fecha estimada L80 (§4.3) · `forecast.ts`
- [x] `forecastLevelDates(...)` — fechas estimadas por nivel (§11.3) · `forecast.ts`
- [x] `calcMilestoneState(...)` — siguiente hito (§12.2) · `milestones.ts`
- [x] `HITOS_POR_DEFECTO` — 9 hitos por defecto (§12.1) · `milestones.ts`

**Resultado**:
- 9 archivos de implementación + 9 de tests en `packages/domain/src/`.
- Cero dependencias de framework. Solo TypeScript stdlib.
- Todos los casos límite cubiertos (XP=0, L80 superado, sodio=0,
  objetivo pequeño, semana exacta, colchón insuficiente, etc.).
- Errores tipados con mensajes específicos para cada validación.

---

## Fase 3 — Modelo de datos y autenticación ✅ CERRADA

**Objetivo cumplido**: usuarios pueden registrarse, hacer login y
configurar su perfil. La BBDD soporta todos los datos operacionales que
necesitarán las fases 5–12.

**Entregables**:
- [x] Schemas Zod completos en `packages/schemas` (auth, user, weight, common)
- [x] Schemas Drizzle de las tablas operacionales:
  - [x] `users`, `auth_sessions`
  - [x] `user_profile` con `profile_version` (versionado para histórico inmutable)
  - [x] `daily_weight`, `daily_entry`, `exercise_log`
  - [x] `attribute_log`, `xp_log`
  - [x] `weeks`, `milestones`
- [x] Auth manual (scrypt + JWT HS256) reemplazando a BetterAuth — ver
      [ADR-013 en el vault](../../Obsidian-brain/03_Recursos/ADR/Pérdida-Peso%20-%20ADR.md):
  - [x] Endpoints `/v1/auth/register|login|refresh|me|logout`
  - [x] Sesiones stateful con `auth_sessions` (logout efectivo)
  - [x] Mensajes genéricos en login (anti-enumeración)
- [x] `JwtAuthGuard` global con decorador `@CurrentUser()` y `@Public()`
- [x] Módulo `users` con upsert de perfil + versionado automático
- [x] Módulo `weights` placeholder (CRUD scoped por user)
- [x] Tests de aislamiento (`tests/isolation.test.ts`): A no ve B,
      logout invalida sesión, /health público
- [x] `packages/api-client` con auth + profile + weights, refresh
      automático ante 401, callback de persistencia de tokens
- [x] Web: páginas `/login`, `/register`, `/onboarding` con look
      cyberpunk; layout con `AuthProvider`; home protegida que muestra
      derivados del perfil

**Diferido a Fase 14** (necesita servicio de email):
- [ ] Email verification
- [ ] Password reset
- [ ] Magic link
- [ ] Refresh con detección de reuso
- [ ] Audit log estructurado
- [ ] Soft-delete con período de gracia 30 días + cron de purga

---

## Fase 4 — Theme cyberpunk y layout principal ✅ CERRADA

**Objetivo cumplido**: el shell visual de la app está terminado.

**Entregables**:
- [x] Variables CSS finales de paleta neón en `globals.css` (verde,
      orange, cyan, blue, purple, pink, red, yellow, magenta + dim)
- [x] Scanlines refinados + vignette CRT + cursor parpadeante +
      animaciones (`neon-shimmer`, `neon-pulse`, `glitch`)
- [x] **shadcn/ui** inicializado con Radix: `Button`, `Input`, `Label`,
      `Progress`, `Badge`, `Separator`, `Dialog`, `Select`. Tematizados
      con paleta neón vía `cva` y variables CSS.
- [x] `NeonCard` reutilizable con título tipo terminal, borde de color
      configurable y `cornerNote`. `PlaceholderCard` para fases futuras.
      `NeonStat` para valores estilo HUD.
- [x] **6 avatares pixel-art SVG** (`warrior`, `mage`, `rogue`,
      `cleric`, `ranger`, `monk`) en `/public/avatars/` con catálogo
      en `lib/avatars.ts`.
- [x] `AvatarFrame` con marco neón + leyendas tipo HUD ("LUDOTEMPLO").
- [x] `AvatarGallery` con selector accesible (radiogroup).
- [x] **Onboarding como wizard de 2 pasos**: paso 1 elegir avatar,
      paso 2 datos del perfil. Estado mantenido entre pasos.
- [x] Persistir avatar en BBDD: columna `users.avatar_id`, schema Zod
      `avatarIdSchema`, endpoint `PUT /v1/users/me/avatar`,
      `api.updateAvatar()`.
- [x] **AppShell**: header + sidebar izquierda (avatar + stats) +
      columna derecha. Header con email + logout.
- [x] Home `/` refactorizada con `AppShell`:
  - Sidebar con `AvatarFrame`, card STATS, card PERFIL.
  - Estado vacío "registra tu primer peso" cuando no hay datos.
  - Card PESO con báscula/media 7d/teórico (placeholder valores).
  - Grid de 9 `PlaceholderCard` indicando fase de cada feature.
- [x] `TerminalShell` refinada: glow en borde, cursor parpadeante en
      título, footer "SISTEMA RPG · v0.0.0".

---

## Fase 5 — Pesos diarios y dashboard de cabecera ✅ CERRADA

**Objetivo cumplido**: cabecera de la imagen 1 (cards PESO + RANGO
ESPERADO) totalmente funcional con datos reales.

**Endpoints**:
- [x] `PUT /v1/weights` idempotente por fecha (ya existía de Fase 3)
- [x] `DELETE /v1/weights/:fecha`
- [x] `GET /v1/weights?from=&to=`
- [x] `GET /v1/dashboard/header` con báscula, media 7d, peso teórico,
      retención desglosada y badge DENTRO/FUERA. Calculado con
      funciones puras de `packages/domain`.

**Schemas**:
- [x] `dashboardHeaderSchema` + tipos DTO en `packages/schemas/src/dashboard.ts`.

**Web**:
- [x] **TanStack Query** con `QueryProvider` global en layout.
- [x] `WeightCard` con Dialog para actualizar/borrar peso de hoy y
      optimistic updates.
- [x] `RangeCard` con rango grande, badge animado y desglose de
      retención coloreado (sodio amarillo, glucógeno cian, digestivo
      morado).
- [x] Home `/` con `useQuery` para profile y header.
- [x] STAT "Media" en sidebar reflejando media 7d real.

**Tests**:
- [x] `tests/dashboard.test.ts` con 5 tests: 404 sin perfil,
      NO_REGISTRADO sin pesos, un peso, varios pesos (media móvil
      correcta), idempotencia del PUT del mismo día.

**Cliente HTTP**:
- [x] `api.getDashboardHeader()` añadido al `ApiClient`.

---

## Fase 6 — Sistema de XP, niveles y barras ✅ CERRADA

**Objetivo cumplido**: cards EXPERIENCIA, SIG. HITO y CAMINO TOTAL
funcionando con datos reales calculados desde `xp_log`.

**Endpoints**:
- [x] `GET /v1/xp/summary` — xpTotal (SUM xp_log), nivelActual,
      xpEnNivel, xpFalta, progresoPct (con `calcLevelState` del
      domain), próximo hito (con `calcMilestoneState`), hitos
      completos con flag `alcanzado`, stats agregados.
- [x] `POST /v1/xp/manual` — añade fila tipo `M` en xp_log con
      `profileVersionId` del perfil vigente.

**Schemas**:
- [x] `xpSummarySchema`, `manualXpInputSchema`, `milestoneDtoSchema`,
      `xpLogEntrySchema` en `packages/schemas/src/xp.ts`.

**Web**:
- [x] `ExperienceCard` con barra amarilla shimmer y porcentaje grande
      centrado, footer "SIG. NIVEL X XP (~Xd)" según xpDiaEstimado.
- [x] `NextMilestoneCard` roja con nombre del hito + nivel + XP que
      falta. Caso "JEFE FINAL SUPERADO" en L80.
- [x] `LevelPathCard` con barra L0→L80 segmentada en 80 celdas
      (alcanzadas en morado neón, pendientes en gris) y porcentaje
      recorrido superpuesto.
- [x] Sidebar STATS conectada (Racha, Hoy, Media, BMR real, Semana,
      Colchón). Avatar `captionRight` muestra `NVL X-80` y
      `footerRight` los hitos alcanzados/total.

**Stats backend**:
- [x] `xpHoy`: SUM xp_log WHERE fecha = hoy.
- [x] `xpSemanaActual`: SUM WHERE fecha >= lunes_actual.
- [x] `xpMediaDia`: xpTotal / días desde fechaInicio.
- [x] `bmr`: `calcBMR` con último peso báscula (o pesoInicial si no
      hay).
- [x] `rachaDias`: días consecutivos con xp > 0 desde hoy hacia atrás
      (limitado a 60 días por query).
- [x] `colchon`: 0 (placeholder hasta Fase 10).

**Tests**:
- [x] `tests/xp.test.ts` con 6 tests: 404 sin perfil, fresh user,
      level-up con XP manual, XP decimal, rechazo de xp=0, xpHoy
      acumulado, BMR usa último peso registrado.

---

## Fase 7 — Entradas diarias: deporte e hidratación ✅ CERRADA

**Objetivo cumplido**: imagen 4 completa con recálculo automático de
XP por cada mutación.

**Endpoints**:
- [x] `GET /v1/entries/:date` (DTO con litros efectivos y meta dinámica
      calculados por el backend).
- [x] `PUT /v1/entries/:date` con upsert + recálculo transaccional de
      `xp_log` (tipos P y C) y sincronización del atributo `HID`.
- [x] `GET /v1/entries/:date/exercise` (lista con XP por sesión).
- [x] `POST /v1/entries/:date/exercise` con recálculo `xp_log` L.
- [x] `DELETE /v1/entries/:date/exercise/:id` con recálculo `xp_log` L.

**Recálculo idempotente**:
- [x] Pasos → calcStepXP, reescribe (no duplica) `xp_log` tipo P.
- [x] kcalIn → calcDeficitXP con TDEE = BMR × factor_actividad,
      reescribe `xp_log` tipo C.
- [x] Ejercicio → calcExerciseXP (factor 0.7), reescribe `xp_log` L.
      Caminatas no generan `xp_log` (los pasos ya cuentan aparte).
- [x] Hidratación cumplida → +1 a HID en `attribute_log` (idempotente:
      si en el mismo día deja de cumplirse, se retira).

**Web**:
- [x] `DeporteCard` con form pasos (XP en vivo cliente-side con
      `calcStepXP`), tabs Ejercicio/Caminata, lista de ejercicios
      añadidos con XP por sesión y delete.
- [x] `HidratacionCard` con barra `litros_efectivos / meta`, badge
      "META CUMPLIDA ✓", input sodio con switch g/mg, 3 cards de
      bebidas con quick-buttons +0.33 +0.5 +1 +1.5L.
- [x] Componente `DateNav` reutilizable (◀ fecha ▶) con cap a hoy.
- [x] Tras mutación, invalida `entry`, `exercises`, `dashboardHeader`
      y `xpSummary` para refrescar la home en vivo.

**Tests**:
- [x] `tests/entries.test.ts` con 10 tests: GET vacío, PUT pasos,
      reescritura no duplica, kcalIn con TDEE moderado, mixto pasos +
      kcal independientes, exercise factor 0.7, caminata no XP, HID
      cumple/baja, sodio rompe meta, refresco zero al 70%.

---

## Fase 8 — Atributos y radar ✅ CERRADA

**Objetivo cumplido**: imagen 3 completa con 9 barras coloreadas, radar
chart y modal PRO.

**Endpoints**:
- [x] `GET /v1/attributes` — los 9 atributos con valor (SUM delta del
      attribute_log), modo (`MANUAL` / `AUTO_HIDRATACION` /
      `AUTO_PRODUCTIVIDAD`), `alcanzadoHoy` y `productividadHoy` (solo
      para PRO). `total` agregado.
- [x] `POST /v1/attributes/:code/increment` con reglas:
  - HID rechazado (es AUTO desde `EntriesService.syncHidAttribute`).
  - PRO requiere `value` (0..3); delega en `EntriesService.upsert`
    para actualizar `daily_entry.productividad` que dispara el sync.
  - Resto: +1 si no hay registro del día (idempotencia: 400 si ya hay).
- [ ] ~~`GET /attributes/log?filter=`~~ → diferido a Fase 12 (Registro
      de Atributos como log scroll).

**Sync PRO en EntriesService**:
- [x] `syncProAttribute(tx, userId, fecha, productividad)`: borra
      filas PRO del día y reinserta una con `delta = productividad`
      si > 0. Llamado desde `upsert()` tras `syncHidAttribute()`.

**Web**:
- [x] `AttributesCard` con 9 filas (código + barra coloreada +
      valor + acción). Botón +1 según modo:
  - MANUAL → modal con descripción opcional.
  - AUTO_HIDRATACION → badge "AUTO".
  - AUTO_PRODUCTIVIDAD → modal con 4 botones (TERRIBLE/FLOJO/DECENTE/BRUTAL).
- [x] `AttributesRadar` con `RadarChart` de Recharts, 9 ejes
      coloreados, escala max 15/20/25/30+ reajustable al valor más alto.
- [x] `lib/tones.ts` central con `TONE_VAR` y `toneVar(code)` para
      mapear códigos cortos a variables CSS.
- [x] Home `/` con grid `lg:grid-cols-[2fr_1fr]` (barras a la izda,
      radar a la dcha).

**Tests**:
- [x] `tests/attributes.test.ts` con 9 tests: GET inicial, +1 FUE
      bloquea segundo, HID rechaza, PRO sin value 400, PRO con value
      actualiza daily_entry, PRO sobrescribe, PRO=0 no genera fila,
      cumplir hidratación da +1 HID, total agregado.

---

## Fase 9 — Gráfica de evolución de peso ✅ CERRADA

**Objetivo cumplido**: imagen 2 reproducida con banda sombreada del
rango esperado, peso real, media móvil 7d y peso teórico (XP).

**Endpoints**:
- [x] `GET /v1/charts/weight?range=7d|30d|90d|all` — devuelve serie
      temporal `{ fecha, pesoReal, media7d, pesoTeorico, rangoMin,
      rangoMax }` por día + stats (`min`, `max`, `delta`).

**Cómputo en backend**:
- [x] Carga única de pesos, daily_entry (sodio) y xp_log del rango.
- [x] **xp_log se carga completo** (no solo del rango) para que
      `xpAcumulado` sea correcto en el primer punto del rango.
- [x] Pre-rellena la ventana móvil con 6 pesos previos al rangeStart
      (para que la `media_7d` del primer punto sea realista).
- [x] Itera día a día calculando: peso real (lookup), media móvil 7d
      (`calcMovingAverage`), xpAcumulado prefix-sum, peso teórico
      (`pesoInicial − xpAcum/7700`), retención (`calcRetention(sodio)`),
      banda min/max.
- [x] Stats `min/max/delta` sobre los `pesoReal` no-null. delta = ult−pri.

**Web**:
- [x] `WeightChartCard` con `ComposedChart` de Recharts:
  - **Banda sombreada** con `<Area>` y `dataKey={(d) => [d.rangoMin, d.rangoMax]}`.
  - Peso teórico (verde dashed, `<Line>`).
  - Media 7d (cian sólida).
  - Peso real (naranja con puntos).
- [x] Filtros 7/30/90/Todo en el corner-note.
- [x] Header con `MIN/MAX/Δ` (delta verde si negativo, rojo si positivo).
- [x] Leyenda inferior custom con líneas de muestra.
- [x] Tooltip neón con formato es_ES (dd mes).
- [x] Estados: cargando, sin datos, render normal.

**Tests**:
- [x] `tests/charts.test.ts` con 8 tests: serie vacía, un peso (media
      = peso, delta null), dos pesos (delta correcto), XP manual baja
      teórico desde fecha, range 'all' parte de fecha_inicio, range
      por defecto 30d, range inválido 400, banda min&lt;max siempre.

---

## Fase 10 — Semanas y colchón ✅ CERRADA

**Objetivo cumplido**: imagen 5 reproducida con tabla cronológica de
semanas, barra bicolor (xp propio + colchón invertido) y mecánica de
inversión del colchón.

**Endpoints**:
- [x] `GET /v1/weeks` — lista cronológica DESC con xp_total, estado,
      colchón, además de `colchonTotal` y `semanasOk/semanasTotales`.
      **Materializa al vuelo** las semanas terminadas (lun-dom) que aún
      no tienen fila: SUM xp del rango → estado `MAS_XP` o `DEFICIT` →
      INSERT. La semana en curso se calcula sin materializar.
- [x] `POST /v1/weeks/:id/apply-colchon` con validaciones: la semana
      debe estar en `DEFICIT` y el colchón disponible debe cubrir lo
      que falta para 7700.

**Conexión con Fase 6**:
- [x] `XpSummary.stats.colchon` ahora refleja el cálculo real
      (`SUM(colchon_recibido) − SUM(colchon_invertido)`) en lugar del
      placeholder 0. `XpService` inyecta `WeeksService.computeColchonTotal`.

**Web**:
- [x] `WeeksCard` con tabla cronológica DESC. Cada fila: rango lun-dom,
      barra bicolor (naranja propio + cian colchón invertido), `xp/7700`,
      acción según estado.
- [x] Header con `COLCHÓN +XXX` y `X/Y OK`.
- [x] Click en DEFICIT abre Dialog con resumen y botón "Invertir X XP".
      Validación cliente y servidor de colchón suficiente.
- [x] Layout ancho completo en home (sin grid 2-col).

**Tests**:
- [x] `tests/weeks.test.ts` con 7 tests: usuario nuevo (en curso),
      semana MAS_XP (excedente al colchón), semana DEFICIT, aplicar
      colchón → COMPENSADA + colchón total baja, colchón insuficiente
      400, aplicar colchón a MAS_XP/EN_CURSO 400, XpSummary refleja
      colchón real (Fase 6 ↔ Fase 10).

---

## Fase 11 — Camino al destino ✅ CERRADA

**Objetivo cumplido**: imagen 6 reproducida con compra de niveles
desde el colchón.

**Endpoints**:
- [x] `GET /v1/path/destination` con KPIs (nivel actual, destino L80,
      restantes, compradas), barra `pctCamino`, llegada estimada,
      lista CONSEGUIDOS (NATURAL + COMPRADA con fechas) y POR VENIR
      (forecastLevelDates).
- [x] `POST /v1/path/buy-level` con validación: colchón ≥ xpPorNivel,
      nivel < 80, inserta fila en `level_purchases`.

**Schema BBDD**:
- [x] Nueva tabla `level_purchases` (id, user_id, nivel, xp_invertida,
      comprada_at) con UNIQUE (user_id, nivel).

**Conexiones cross-fase**:
- [x] `WeeksService.computeColchonTotal` descuenta también
      `SUM(level_purchases.xp_invertida)`.
- [x] `XpService.getSummary` calcula `nivelActual = naturales +
      comprados`. Si llega a 80 (jefe final), normaliza progreso a
      completado.

**Web**:
- [x] `PathCard` con header LLEGADA EST., 4 KPIs, barra grande
      L0→L80 con marker "AQUÍ", listas paralelas POR VENIR y
      CONSEGUIDOS (scroll vertical, etiqueta NATURAL/COMPRADA),
      footer con "FUNDIR X XP DEL COLCHÓN" + botón COMPRAR 1 SEMANA
      con Dialog de confirmación.

**Tests**:
- [x] `tests/path.test.ts` con 6 tests: usuario nuevo, XP cruza
      niveles → conseguidos NATURAL, compra sin colchón 400, compra
      con colchón → +1 nivel, XpSummary refleja nivelActual real,
      L80 → no se puede comprar más.

---

## Fase 12 — Bitácora y Registro de Atributos ✅

**Objetivo**: imágenes 7 y 8 completas.

**Schemas Zod** (`packages/schemas/src/log.ts`):
- [x] `xpLogEntryDtoSchema`, `xpLogPageSchema`
- [x] `attributeLogEntryDtoSchema`, `attributeLogPageSchema`
- [x] `logPageQuerySchema` (cursor opcional + limit 1..200, default 50)
- [x] `attributeLogQuerySchema` (extiende con `atributo?`)

**Helper cursor** (`apps/api/src/common/cursor.ts`):
- [x] `encodeCursor({ createdAt, id }) → base64url`
- [x] `decodeCursor(raw) → PageCursor | null` (tolerante a basura)

**Endpoints**:
- [x] `GET /v1/xp/log` con tuple comparison `(created_at, id) < (cursor)`
- [x] `GET /v1/attributes/log` con filtro `atributo` opcional
- [x] `limit + 1` para detectar `hasMore`, `COUNT(*)::int` para total

**Cliente HTTP**:
- [x] `getXpLog(query)` y `getAttributesLog(query)` en api-client
- [x] `queryKeys.xpLog` y `queryKeys.attributesLog(filter)`

**Web**:
- [x] `BitacoraCard` con `useInfiniteQuery` + `IntersectionObserver`
      (rootMargin 160px). Filas grid con tipo coloreado (P/C/L/H/A/M),
      fecha dd/mm, descripción truncada, XP en color del tipo o rojo
      si negativo.
- [x] `RegistroAtributosCard` con tabs filtro TODO/FUE/.../HID/PRO
      (filtro forma parte de la queryKey → reset automático al
      cambiar). Cada chip con borde de color del atributo.
- [x] Home conectada — cero placeholders restantes.

**Tests** (`tests/logs.test.ts`, requieren BBDD viva):
- [x] 7 tests: usuario sin entradas, paginación con cursor sin
      duplicados, cursor inválido degrada a primera página, aislamiento
      entre usuarios, filtro por atributo, paginación con filtro,
      atributo inválido → 400.

---

## Fase 13 — Pulido visual ✅

**Objetivo**: la app se siente como un videojuego retro.

**Animaciones (Framer Motion)**:
- [x] `framer-motion` añadido como dep de `apps/web`.
- [x] Barras animadas con `motion.div` + spring transition:
  `ExperienceCard` (barra amarilla), `LevelPathCard` (segmento
  parcial), `HidratacionCard`, `WeeksCard` (bicolor con stagger
  para el colchón), `PathCard` (L0→L80) y `AttributesCard` (9
  filas).

**Level-up**:
- [x] Hook `useLevelUp(nivelActual, userId)` que detecta subidas y
  persiste el último nivel visto en localStorage por usuario
  (`pp:lastSeenLevel:<id>`). Primera carga inicializa sin
  disparar; bajadas (test data) se aceptan sin disparar.
- [x] Componente `LevelUpOverlay` con `AnimatePresence`: fondo blur,
  título "★ LEVEL UP ★" con animación de textShadow pulsante,
  transición de "NVL N → NVL M". Auto-dismiss a 3.5 s, click o Esc
  para cerrar.

**Easter eggs**:
- [x] **Konami Code** (↑↑↓↓←→←→BA): activa "MODO ARCADE" — clase
  `arcade-mode` en `<html>`, satura paleta + intensifica scanlines
  + pulse en headers. Toggle persistido en `pp:arcade`.
  Listener global montado en `RootLayout` (`EasterEggsListener`).
- [x] **5 clicks en avatar** muestran un toast oculto. Wrapper
  `FiveClickEasterEgg` con reset a 1.5 s entre clicks.

**Responsive móvil**:
- [x] Header del shell con email oculto en `< md`, "logout" sólo
  como icono en `< sm`, padding ajustado.
- [x] `WeeksCard` con grid `[6.5rem 1fr 3.5rem 5rem]` en móvil y
  `[10rem 1fr 5rem 8rem]` en `sm:`.
- [x] `BitacoraCard` y `RegistroAtributosCard` con grids de filas
  más estrechos en móvil.
- [x] `AppShell` ya colocaba la sidebar arriba en `< lg` (full
  width).

**Accesibilidad / Lighthouse**:
- [x] `prefers-reduced-motion` global en `globals.css`: anula
  animaciones para usuarios que lo solicitan.
- [x] `viewport.themeColor` y `colorScheme: 'dark'` en metadata de
  Next.js 15.
- [x] **Skip link** "Saltar al contenido principal" en `AppShell`,
  oculto con `sr-only` y visible al recibir foco.
- [x] `aria-label="Cerrar sesión"` en el botón de logout.
- [x] `formatDetection: { telephone, email, address: false }` para
  evitar transformaciones automáticas iOS Safari.
- [ ] Pasada Lighthouse pendiente del usuario (requiere `pnpm dev`
  en local).

**Sonidos**: descartados — requerirían assets externos. Deferidos
a una posible Fase 13.5 con Web Audio API si llegan a hacer falta.

---

## Fase 14 — Emails transaccionales ✅

Necesario antes de abrir registros a otros usuarios.

**Provider y stack**:
- [x] **Nodemailer + SMTP** (provider-agnostic): dev contra `mailpit`
      del docker-compose, prod configurable vía `.env`
      (Resend SMTP, SES, postal, etc.).
- [x] **Sin BullMQ/Redis**: envío síncrono (suficiente para volumen
      MVP). Errores de SMTP se loguean sin romper el request.
- [x] HTML inline + plain text como funciones puras
      (`apps/api/src/mailer/templates.ts`). Sin React Email todavía
      (3 plantillas no compensan el coste).

**Schemas**:
- [x] Tabla `email_tokens` (id, user_id, type, token_hash, expires_at,
      used_at, created_at) con UNIQUE en token_hash.
- [x] Columnas nuevas en `users`: `email_verified_at`, `deleted_at`,
      `purge_scheduled_at` con índice.
- [x] `tokenInputSchema`, `requestPasswordResetInputSchema`,
      `resetPasswordInputSchema`, `deleteAccountInputSchema` en
      `packages/schemas/src/auth.ts`.

**Endpoints**:
- [x] `POST /v1/auth/verify-email` (público, body `{ token }`).
- [x] `POST /v1/auth/resend-verification` (autenticado).
- [x] `POST /v1/auth/request-password-reset` (público, devuelve 204
      siempre — no revela si el email existe).
- [x] `POST /v1/auth/reset-password` (público, token + new password).
      Revoca todas las sesiones del usuario al cambiar password.
- [x] `POST /v1/auth/delete-account` (autenticado, requiere password).
      Marca `deleted_at` + `purge_scheduled_at = now + 30d`, revoca
      sesiones, envía email.
- [x] `register` ahora dispara email de verificación (fire-and-forget).

**Cron de purga**:
- [x] `PurgeService` con `@nestjs/schedule` corre cada día a las 3am.
      Borra users con `purge_scheduled_at <= now()` (cascada FK
      limpia el resto). Limpia tokens de email caducados con > 7d
      antigüedad.
- [x] Método `runNow()` para tests.

**Plantillas**:
- [x] Verificación de email (cyan, TTL 24h).
- [x] Password reset (orange, TTL 1h).
- [x] Cuenta marcada para eliminación (red, fecha de purga).

**Web**:
- [x] `/forgot-password` form email.
- [x] `/reset-password?token=` form nueva password con confirmación.
- [x] `/verify-email?token=` consume token y refresca `me`.
- [x] `/settings` con datos de cuenta + reenviar verificación + zona
      de peligro con borrado.
- [x] Banner naranja "EMAIL SIN VERIFICAR" en home cuando
      `me.emailVerifiedAt == null`. Botón "Reenviar" + link a
      `/settings`.
- [x] Link "¿Olvidaste la contraseña?" en `/login`.

**Tests** (`tests/email.test.ts`, requieren BBDD viva):
- [x] 9 tests: verify on register, verify ok, verify token inválido,
      verify token usado, resend si verificado → 400, password reset
      flow completo, request a email inexistente devuelve 204, reset
      con token inválido → 400, delete-account requiere password,
      delete-account marca y envía, cron purga elimina cuentas
      vencidas.

**Diferidos**:
- [ ] Login alert con nueva IP/device (descartado en esta fase, el
      usuario lo prefiere en una iteración posterior cuando haya
      demanda real).

---

## Fase 15 — Panel de administración ✅

**Modelo**:
- [x] Columna `users.role` con `pgEnum('user_role', ['user','admin'])`,
      default `user`, índice. Columna `users.suspended_at` con índice.
- [x] Tabla nueva `admin_audit_log` (admin_user_id, target_user_id,
      action pgEnum, payload jsonb, ip_hash SHA-256, user_agent).
- [x] Schemas Zod en `packages/schemas/src/admin.ts`: `userRoleSchema`,
      `AdminMetrics`, `AdminUserListItem/Page/Query`, `AdminUserDetail`,
      `AdminAuditEntry/Page/Query`, `AdminSuspendInput`,
      `ImpersonateOutput`. `meSchema` extendida con `role`.

**Guard**:
- [x] `@AdminOnly()` decorator + `AdminGuard` (NestJS) que carga
      `users.role` cuando un controlador está marcado. Ahorra el
      round-trip a BBDD en rutas no-admin.
- [x] Login bloquea cuentas con `suspendedAt` (mensaje "Cuenta
      suspendida. Contacta con soporte.").

**Endpoints**:
- [x] `GET /v1/admin/metrics`: totalUsers, activeUsers,
      verifiedUsers, suspendedUsers, pendingDeletionUsers,
      newUsersLast7d/30d, activeLast7d/30d (sesiones distintas),
      mrrCents (placeholder a 0 hasta Fase 17).
- [x] `GET /v1/admin/users` con paginación cursor + búsqueda `?q=`
      (ilike sobre email). Incluye `lastSeenAt` agregado por user.
- [x] `GET /v1/admin/users/:id` con detalle: perfil, sesiones,
      lastSeenAt.
- [x] `POST /v1/admin/users/:id/suspend` (revoca sesiones, rechaza
      auto-suspend), `POST /v1/admin/users/:id/restore` (204).
- [x] `POST /v1/admin/users/:id/impersonate` crea sesión del target
      y devuelve tokens. **Rechaza impersonar a otros admin**. Audita.
- [x] `GET /v1/admin/audit` paginado DESC con `adminEmail` y
      `targetEmail` resueltos.

**Tooling**:
- [x] Script `apps/api/scripts/promote-admin.ts` ejecutable como
      `pnpm --filter @perdida-peso/api admin:promote <email>`.
      Idempotente (no falla si ya es admin). Usado para bootstrap del
      primer admin.

**Web**:
- [x] `/admin/layout.tsx` guard cliente: redirige si `me.role !==
      'admin'`. Header sticky con nav (Métricas / Usuarios / Audit
      log / volver).
- [x] `/admin` con métricas en 3 cards (USUARIOS, ADQUISICIÓN, MRR
      placeholder).
- [x] `/admin/users` con búsqueda debounced (300ms) +
      `useInfiniteQuery` + IntersectionObserver. Status calculado
      (activo / sin verificar / suspendido / borrado) coloreado.
- [x] `/admin/users/[id]` con datos, perfil, sesiones y acciones
      (suspender/restaurar, impersonar). Acciones deshabilitadas
      sobre admins.
- [x] `/admin/audit` con `useInfiniteQuery`. Filas con tipo de acción
      coloreado, fecha, admin email y target email.
- [x] `ImpersonateBanner` global rojo en root layout. Muestra
      "MODO IMPERSONACIÓN · admin <email>". Botón "Salir" hace
      logout del target + restaura tokens del admin desde
      localStorage `pp:impersonate-prev`.
- [x] Link "▣ admin" en header del `AppShell` si `me.role === 'admin'`.

**Tests** (`tests/admin.test.ts`, requieren BBDD viva):
- [x] 8 tests: non-admin → 403, métricas, lista con búsqueda,
      detail, suspend/login bloqueado/restore/login funciona,
      impersonate genera tokens del target + audit, no impersonar
      admin → 403, no auto-suspend → 400.

---

## Fase 16 — Legal y cumplimiento ✅

**Backend**:
- [x] Tabla `consent_log` (user_id, type pgEnum, version, accepted_at,
      ip_hash SHA-256, user_agent). Audit trail inmutable.
- [x] `ConsentService` con `accept` (hashea IP) y `listForUser` DESC.
- [x] Endpoints `POST /v1/consents` y `GET /v1/consents/me`.
- [x] `ExportService.buildExport(userId)` con `Promise.all` de 12
      tablas. **Excluye** `passwordHash` y `tokenHash`s (datos
      derivados, no aportan al portarse).
- [x] `GET /v1/users/me/export` con `Content-Disposition: attachment`
      + `Cache-Control: no-store`.
- [x] Schemas Zod en `packages/schemas/src/legal.ts` con
      `CURRENT_LEGAL_VERSIONS = { terms: 1, privacy: 1, cookies: 1 }`.

**Páginas legales (MDX)**:
- [x] Setup `@next/mdx` + `@mdx-js/react` + `@mdx-js/loader` con
      `pageExtensions` ampliado.
- [x] `mdx-components.tsx` con estilos neón coherentes
      (h1 verde, h2 cyan + subrayado, h3 orange, code/blockquote).
- [x] `apps/web/src/app/legal/layout.tsx` con header sticky + footer
      común.
- [x] `terminos/page.mdx`: plantilla RGPD-compliant con placeholders
      `[TU_NOMBRE_FISCAL]`, `[TU_NIF]`, `[TU_DIRECCION_FISCAL]`,
      `[FECHA_PUBLICACION]`. Cubre identificación, naturaleza del
      servicio (NO consejo médico), cuenta, conducta aceptable,
      propiedad intelectual, disponibilidad, **limitación de
      responsabilidad** específica, modificación, baja, ley aplicable
      (España + ODR UE) y contacto.
- [x] `privacidad/page.mdx`: cumple RGPD + LOPDGDD. Tabla de datos,
      finalidades + base legal, cesiones, plazo conservación (30d
      gracia), derechos ARCO con cómo ejercerlos, AEPD, seguridad
      técnica (scrypt, hash tokens, hash IPs), menores.
- [x] `cookies/page.mdx`: explica que la app **no usa cookies**;
      tabla con localStorage (auth-tokens, lastSeenLevel, arcade,
      cookies-consent). Aclaración ePrivacy CEPD: localStorage
      funcional no requiere consentimiento previo. Sección lista
      para activar si añadimos analytics.

**UI**:
- [x] `CookieBanner` global con `framer-motion`. Compara versión
      almacenada en localStorage contra `CURRENT_LEGAL_VERSIONS.cookies`;
      si menor, vuelve a mostrar. Si autenticado, `POST /v1/consents`
      adicional para audit trail server-side.
- [x] Botón "Descargar mis datos (.json)" en `/settings` (NeonCard
      "MIS DATOS (RGPD)" purple). Crea Object URL del Blob y dispara
      download programático.
- [x] Footer global en `AppShell` con links Términos / Privacidad /
      Cookies / Ajustes.
- [x] `TerminalShell` (login/register/onboarding) también con links
      legales bajo el "SISTEMA RPG · v0.0.0".

**Tests** (`tests/legal.test.ts`, requieren BBDD viva):
- [x] 7 tests: registrar consent + listar, múltiples versiones DESC,
      tipo inválido → 400, aislamiento entre usuarios, export con
      headers correctos + estructura completa, sin password_hash,
      export sin auth → 401.

---

## Fase 17 — Suscripción y billing ✅

**Modelo y precios**:
- [x] Free + Premium definidos en `docs/DOMAIN.md` §16.
- [x] Mensual 4,99 €/mes · Anual 39,99 €/año (≈ −33 %).
- [x] Trial 14 días sin tarjeta vía `STRIPE_TRIAL_DAYS`.
- [x] Stripe Tax + Customer Portal activos (`automatic_tax: { enabled: true }`).

**Schema**:
- [x] Columnas users: `plan` (`pgEnum user_plan`), `stripe_customer_id`,
      `trial_ends_at` con índices.
- [x] Tabla `subscriptions` (`pgEnum subscription_status` y `period`).
- [x] Tabla `billing_events` con `UNIQUE` en `stripe_event_id` para
      idempotencia.
- [x] `meSchema` extendida con `plan`, `effectivePlan`, `trialEndsAt`.
- [x] Schemas Zod en `packages/schemas/src/billing.ts`:
      `BillingState`, `CreateCheckoutInput`, `BillingUrl`, etc.

**Backend**:
- [x] `BillingService` con Stripe SDK lazy-init: `getMyBilling`,
      `createCheckoutSession`, `createPortalSession`,
      `getOrCreateCustomer`, `handleWebhookEvent`.
- [x] Webhook idempotente vía `onConflictDoNothing` en `billing_events`.
- [x] Maneja `checkout.session.completed`,
      `customer.subscription.{created,updated,deleted}`. Sincroniza
      `users.plan` con el status (`active|trialing → premium`).
- [x] Decorador `@RequiresPlan('premium')` + `PlanGuard` (rechaza
      con HTTP 402 + `{ requiredPlan, currentPlan }`).
- [x] Aplicado a `ChartsController`, `WeeksController`,
      `PathController` y `GET /v1/users/me/export`.
- [x] `AuthService.register` set `trial_ends_at = now + STRIPE_TRIAL_DAYS`.
- [x] `getMe` calcula `effectivePlan` (premium si trial activo).
- [x] `main.ts` con `rawBody: true` para que el endpoint de webhooks
      reciba el Buffer crudo necesario para verificar firma.

**Endpoints**:
- [x] `GET /v1/billing/me` (auth): estado actual.
- [x] `POST /v1/billing/checkout` (auth, body `{ period }`): URL Stripe Checkout.
- [x] `POST /v1/billing/portal` (auth): URL Customer Portal.
- [x] `POST /v1/billing/webhooks` (público, signature-verified).

**Web**:
- [x] `/pricing` con cards Free vs Premium, toggle mensual/anual,
      botón Suscribirse → Stripe Checkout.
- [x] Sección "SUSCRIPCIÓN" en `/settings` con plan efectivo, días
      trial restantes y botón Customer Portal.
- [x] `TrialBanner` en home: "TRIAL PREMIUM · X días" durante trial,
      o CTA "DESBLOQUEA PREMIUM" si free post-trial.
- [x] `PremiumLockedCard` sustituye HidratacionCard, WeightChartCard,
      WeeksCard y PathCard cuando `me.effectivePlan === 'free'`.
      Mantiene espacio visual y CTA a `/pricing`.
- [x] Cliente HTTP: `getMyBilling`, `createCheckout`,
      `createPortalSession`.

**Config (env)**:
- [x] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`,
      `STRIPE_TRIAL_DAYS=14`. Vacíos = billing desactivado (no rompe
      arranque).

**Tests** (`tests/billing.test.ts`, requieren BBDD viva):
- [x] 7 tests: trial al registrarse, billing/me coherente, trial activo
      permite acceso premium, trial expirado → 402, plan premium
      directo → acceso, export RGPD bloqueado a free, weeks/path
      bloqueados a free, webhook sin signature → 400.

---

## Fase 18 — Operación a escala ✅ (alcance mínimo viable)

**Decisión**: pack mínimo útil ya, sin Redis/PgBouncer/réplica ni
stack Grafana. Aporta visibilidad inmediata; las piezas de
infraestructura pesada se acometen cuando el disparador "> 50
usuarios concurrentes" se cumpla realmente.

**Healthchecks granulares**:
- [x] `/health/live` (público, sin deps): proceso vivo. Liveness probe.
- [x] `/health/ready` (público, con BBDD): readiness probe; el LB
      retira el pod si falla.
- [x] `/health` (compat) mantiene comportamiento anterior.

**Cache en memoria**:
- [x] `@nestjs/cache-manager` v3 + `cache-manager` v6 con
      `CacheModule.register({ isGlobal: true, ttl: 60_000, max: 1000 })`.
- [x] `AdminService.getMetrics` usa `cacheManager.wrap(key, fn, 30s)`
      — el endpoint más pesado (8 counts + 2 distincts).
- [x] Resto de endpoints sin cache para evitar invalidación
      compleja per-user.

**Métricas Prometheus**:
- [x] `@willsoto/nestjs-prometheus` v6 + `prom-client` v15.
- [x] Endpoint `/metrics` (público, scraped por Prometheus).
- [x] Default metrics (process, GC, event loop, heap).
- [x] Histogram `pp_http_request_duration_seconds{method,route,status}`
      via `HttpMetricsInterceptor` global. Skip `/metrics` y `/health/*`
      para no contaminar.
- [x] Counters preparados: `pp_signups_total`, `pp_logins_total{result}`
      (registrados, listos para usarse desde AuthService cuando
      convenga).
- [x] `defaultLabels: { app: 'perdida-peso-api' }` para multi-app.

**Auth**:
- [x] `JwtAuthGuard` exceptúa `/metrics` y `/health/*` para que sean
      públicos sin requerir `@Public()` en cada endpoint.

**Tests** (`tests/observability.test.ts`):
- [x] 5 tests: `/health/live` público, `/health/ready` con BBDD ok,
      `/health` compat, `/metrics` formato correcto + default metrics,
      counters custom presentes, histogram registra muestras.

**Diferidos hasta tracción real (> 50 usuarios concurrentes)**:
- ⬜ Redis para cache compartido entre múltiples instancias de la API.
- ⬜ PgBouncer para connection pooling.
- ⬜ Réplica de lectura de Postgres.
- ⬜ Stack Grafana + Loki + alertmanager.
- ⬜ Alertas Telegram/email.
- ⬜ CDN (Cloudflare) delante del Nginx Proxy Manager.

---

## Fase 19 — App móvil nativa 🟦

**Disparador**: tracción del producto web.

- [ ] `apps/mobile` con Expo + React Native
- [ ] Reutilización de `packages/domain`, `schemas`, `api-client`
- [ ] BetterAuth con secure storage
- [ ] Pantallas: registro de peso, hidratación, pasos, dashboard reducido
- [ ] Notificaciones push
- [ ] Modo offline con TanStack Query persistido
- [ ] EAS Build, distribución TestFlight/Play Internal

---

## Features futuras con plumbing listo

Trabajo de infraestructura ya plantado, sin UI visible aún. Se
activarán cuando haya validación de usuario o capacity para
diseñarlos.

### Skins visuales como feature Premium 🟡 plumbing listo

- ✅ Tabla `users.theme_preference` (`pgEnum user_theme`, default
  `'cyberpunk'`).
- ✅ Endpoint `PUT /v1/users/me/theme` que actualiza la preferencia.
- ✅ `me.themePreference` expuesto en la sesión.
- ✅ Componente `ThemeApplier` (`apps/web/src/lib/theme.tsx`) aplica
  `<html data-theme="...">` automáticamente al cargar `me`.
- ✅ `globals.css` documenta cómo añadir skins nuevas. Toda la paleta
  vive en variables CSS, así que cada skin nueva es solo un bloque
  `:root[data-theme='...']` con overrides.
- ⬜ Añadir skins reales: cuando haya tracción y se decida monetizar
  más allá del Premium actual. Candidatos legalmente seguros (sin
  marcas registradas): Kawaii, Wizardry, Vaporwave, Dark Academia,
  Solarpunk.
- ⬜ Selector visible en `/settings` (Premium-only si las skins extra
  son de pago).

Detalle en `docs/DOMAIN.md` §16.7 y `CLAUDE.md`.

---

## Decisiones operativas vivas

Cerradas tras Fase 17:

- **Free tier**: peso báscula, XP por déficit/pasos, atributos
  manuales (FUE, VIT, DES, INT, CRE, ESP, CAR), niveles 0-10,
  bitácora reciente. Detalle en `DOMAIN.md` §16.
- **Premium**: hidratación + atributos auto (HID/PRO) + niveles
  0-80 + camino al destino + gráfica con bandas + semanas y
  colchón + bitácora completa + export RGPD.
- **Pricing**: 4,99 €/mes · 39,99 €/año (≈ −33 %). Stripe Tax para
  IVA UE.
- **Trial**: 14 días sin tarjeta. Server-side, no en Stripe.
- **Hosting**: VPS propio (no Vercel).
- **Backups**: pendiente cron diario `pg_dump` → MinIO/B2 (diferido).
- **Telemetría**: métricas Prometheus en `/metrics` (Fase 18).
  Sentry/PostHog se evaluarán cuando haya tracción real.

---

## Cómo actualizar este archivo

Al cierre de cada fase:

1. Marcar la fase como ✅ con fecha de cierre.
2. Mover entregables completados a checkboxes marcados.
3. Mover la siguiente fase a 🔜.
4. Actualizar el resumen ejecutivo arriba.
5. Sincronizar con `CLAUDE.md` §2.
