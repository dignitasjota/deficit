# DOMAIN.md — Modelo de dominio del sistema de gamificación

> **Estado**: ✅ **Fase 0 cerrada**. Todas las decisiones de dominio
> resueltas (ver §18). El código de `packages/domain` se construye sobre
> estas reglas.
>
> **Implementación actual**: completa. Las 10 áreas funcionales
> (`levels`, `bmr`, `xp`, `hydration`, `retention`, `weeks`, `forecast`,
> `milestones`, etc.) están implementadas en `packages/domain` con
> tests Vitest. Modelo de planes Free vs Premium cerrado en §16
> (Fase 17). Ver [`ROADMAP.md`](./ROADMAP.md).
>
> **Documento vivo**: toda la lógica matemática del proyecto vive aquí.
> Cualquier cambio en una fórmula o constante se hace **primero en este
> documento** y después en el código (`packages/domain`). Ver
> [`ARCHITECTURE.md §7`](./ARCHITECTURE.md) para el procedimiento.
>
> **Documentos relacionados**:
> [`CLAUDE.md`](../CLAUDE.md) ·
> [`ROADMAP.md`](./ROADMAP.md) ·
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) ·
> [`DEPLOY.md`](./DEPLOY.md)

---

## 0. Propósito y alcance

El dominio modela un sistema RPG de pérdida de peso inspirado en el sistema de
Rubén Loan. El usuario gana experiencia (**XP**) por mantener un déficit
calórico y hábitos saludables, y sube de **nivel** progresando hacia un
objetivo de peso. La progresión se complementa con **atributos** estilo rol,
una **bitácora** y un **registro** de actividades.

El sistema debe ser:
- **Determinista**: dadas las mismas entradas, siempre produce las mismas
  salidas. Toda la lógica vive en funciones puras testables.
- **Versionado**: si un usuario cambia su objetivo, no se rompe su histórico.
- **Aislado por usuario**: en un sistema multiusuario, ninguna constante
  derivada se mezcla entre cuentas.

---

## 1. Glosario

| Término | Significado |
|---------|-------------|
| **BMR** | Basal Metabolic Rate. Calorías que el cuerpo gasta en reposo absoluto. |
| **TDEE** | Total Daily Energy Expenditure. BMR × factor de actividad. |
| **kcal\_in** | Calorías ingeridas en un día. |
| **Déficit** | `max(0, TDEE − kcal_in)`. |
| **XP** | Puntos de experiencia. 1 kcal de déficit = 1 XP. |
| **Nivel** | Entero 0–80. Coste = `xpPorNivel`. |
| **xpPorNivel** | Coste en XP de subir 1 nivel. Depende del objetivo. |
| **kgPorNivel** | Pérdida de peso teórica que representa cada nivel. |
| **Colchón** | Bolsa de XP excedente acumulado de semanas anteriores. |
| **Rango esperado** | Banda min–max diaria de peso plausible dado el modelo de retención. |
| **Peso teórico** | Peso esperado hoy según el XP acumulado. |
| **Hito** | Meta intermedia con nombre (ej. Talla XXL @ L40). |
| **Bitácora** | Log cronológico de eventos de XP. |
| **Registro** | Log cronológico de incrementos de atributos. |

---

## 2. Perfil de usuario

### 2.1 Campos guardados

| Campo | Tipo | Origen | Notas |
|-------|------|--------|-------|
| `peso_inicial_kg` | decimal | onboarding | inmutable; ancla del progreso |
| `peso_objetivo_kg` | decimal | onboarding | el "destino"; permite editarlo y versiona |
| `altura_cm` | decimal | onboarding | |
| `fecha_nacimiento` | date | onboarding | usado para edad en BMR |
| `sexo` | enum `M/F` | onboarding | factor en Mifflin–St Jeor |
| `factor_actividad` | enum (ver §3.2) | onboarding | editable |
| `fecha_inicio` | date | onboarding | día 0 del progreso |
| `nivel_inicio` | int | derivado | normalmente 0 |
| `nivel_destino` | int | constante | siempre **80** |

### 2.2 Campos derivados (calculados, no se guardan crudos)

```
kgPorNivel       = (peso_inicial - peso_objetivo) / 80
xpPorNivel       = kgPorNivel × 7700
xpSemanalMeta    = 7700              // FIJO para todos los usuarios
nivelesPorSemana = xpSemanalMeta / xpPorNivel
                 = 80 / (peso_inicial - peso_objetivo)
semanasA_L80     = peso_inicial - peso_objetivo   // = nº de kg a perder
```

**Cuando el usuario cambia su objetivo**, los derivados se recalculan a partir
del cambio en adelante. El histórico anterior queda etiquetado con la versión
del perfil que lo generó (ver §15.3).

### 2.3 Caso límite: objetivos pequeños

Si `peso_inicial - peso_objetivo < 5 kg`, los niveles se ganan a un ritmo
≥ 16/semana, lo que rompe la sensación de progreso. Mitigación propuesta
(fuera de scope inicial): cap mínimo `xpPorNivel ≥ 1000`. Solo se aplica si
en uso real molesta.

---

## 3. Cálculo energético

### 3.1 BMR — Mifflin–St Jeor ✅ CERRADO

Fórmula oficial del sistema:

```
Hombre:  BMR = 10·peso_kg + 6.25·altura_cm − 5·edad + 5
Mujer:   BMR = 10·peso_kg + 6.25·altura_cm − 5·edad − 161
```

Razón: menor error medio documentado en población general adulta. Solo
requiere peso, altura, edad y sexo (datos ya en el perfil).

### 3.2 Factor de actividad (TDEE)

```
TDEE = BMR × factor_actividad
```

| Factor | Valor | Descripción |
|--------|-------|-------------|
| `sedentario` | 1.20 | Trabajo de oficina, poco movimiento |
| `ligero` | 1.375 | Ejercicio ligero 1–3 días/semana |
| `moderado` | 1.55 | Ejercicio moderado 3–5 días/semana |
| `activo` | 1.725 | Ejercicio intenso 6–7 días/semana |
| `muy_activo` | 1.90 | Ejercicio muy intenso o trabajo físico |

> El TDEE se recalcula diariamente con el peso báscula del día (no con la
> media), porque BMR es función del peso actual.

---

## 4. Sistema de progresión (niveles)

### 4.1 Reglas (CERRADAS)

```
xpTotal      = suma de todas las XP ganadas desde fecha_inicio
nivelActual  = floor(xpTotal / xpPorNivel)
xpEnNivel    = xpTotal mod xpPorNivel
progresoPct  = xpEnNivel / xpPorNivel
xpFalta      = xpPorNivel − xpEnNivel
```

Si `nivelActual > 80`, queda topado a 80 y el excedente se considera
"Jefe Final superado" (estado especial).

### 4.2 Camino total

Barra segmentada de 80 segmentos. Cada segmento = 1 nivel. Marker en
`nivelActual`. Etiqueta de "% camino recorrido" = `nivelActual / 80`.

### 4.3 Pronóstico de llegada a L80

```
nivelesRestantes        = 80 − nivelActual
xpFaltanteParaL80       = nivelesRestantes × xpPorNivel − xpEnNivel
xpDelColchonDisponibles = colchon_actual                  // ver §10
xpQueDebeGenerar        = xpFaltanteParaL80 − xpDelColchonDisponibles
semanasRestantes        = ceil(xpQueDebeGenerar / xpSemanalMeta)
fechaEstimadaLlegada    = hoy + semanasRestantes × 7 días
```

---

## 5. Generación de XP

### 5.1 Por déficit calórico

```
xp_deficit = max(0, TDEE − kcal_in)
```

Si `kcal_in = 0` (no se ha registrado), no se cuenta el día como déficit
automáticamente: queda en `null` y la barra de XP no avanza por ese motivo.

### 5.2 Por pasos ✅ CERRADO

```
pasos_computables = min(pasos_dia, 25000)
xp_pasos          = pasos_computables × peso_kg × 0.00032
```

- Constante `0.00032` = aproximación clásica de kcal por paso normalizada
  por peso. Resultado redondeado a entero.
- **Tope diario: 25.000 pasos**. Por encima suelen ser errores del sensor
  o casos extremos. La UI muestra los pasos reales; solo el cómputo de XP
  los limita.

### 5.3 Por ejercicio

```
xp_ejercicio = kcal_quemadas × 0.7
```

El `0.7` (70 %) se conserva del sistema original como penalización para
evitar doble conteo con el TDEE elevado de los días de ejercicio.

> **Caminata** (separada de ejercicio): se contabiliza con la fórmula de
> pasos, no con la de ejercicio.

### 5.4 Por hidratación ✅ CERRADO

La hidratación **no genera XP**. Es un atributo en modo `AUTO`:

```
si litros_efectivos >= meta_hidratacion:
    incrementar atributo HID en +1 (una vez al día)
xp_hidratacion = 0   // siempre
```

`litros_efectivos = litros_agua + 0.7 × litros_refresco_zero` (ver §7.2 para
multiplicadores completos).

Razón: coherente con las capturas del sistema original donde HID aparece
con badge `AUTO`. Mantiene la hidratación como hábito sin inflar XP.

### 5.5 Otros (manual)

Botón "Introducir XP" permite añadir entradas manuales con descripción.
Caso de uso: ajustes, premios por hitos no cubiertos por las fórmulas.

---

## 6. Atributos

### 6.1 Lista cerrada de 9 ✅ CERRADO

| Código | Nombre | Color | Criterio `+1` |
|--------|--------|-------|---------------|
| `FUE` | Fuerza | rojo | Sesión de fuerza/gimnasio ≥ 30 min, calistenia, levantamiento de peso |
| `VIT` | Vitalidad | verde | Cardio sostenido ≥ 30 min (correr, bici, remo, natación, HIIT) |
| `DES` | Destreza | amarillo | Deporte de coordinación: baile, artes marciales, esgrima, tenis, escalada |
| `INT` | Intelecto | azul | ≥ 30 min de estudio formal: idiomas, cursos, libro técnico, código personal |
| `CRE` | Creatividad | cian | Producción creativa: dibujo, música, escritura, fotografía, manualidades |
| `ESP` | Espíritu | morado | Meditación ≥ 10 min, naturaleza ≥ 1h, yoga, journaling, oración |
| `CAR` | Carisma | rosa | Interacción social significativa: quedar con gente, hablar en público, networking |
| `HID` | Hidratación | turquesa | **AUTO**: cumplir meta diaria de litros (§7) |
| `PRO` | Productividad | naranja | **AUTO**: escala 0/+1/+2/+3 según día declarado |

Reglas comunes:
- Máximo **+1 por atributo por día**, pero un mismo evento puede sumar a
  varios atributos (ej. "Bachata 233min" suma a DES, VIT y CAR).
- Cada incremento se persiste en `attribute_log` con descripción y fecha.
- HID y PRO se calculan automáticamente; los demás se introducen
  manualmente.

### 6.2 Productividad (PRO)

Escala diaria autodeclarada:

| Nivel | Valor | Descripción |
|-------|-------|-------------|
| `terrible` | 0 | nada productivo |
| `flojo` | +1 | algunas tareas pero por debajo de lo normal |
| `decente` | +2 | día normal de trabajo cumplido |
| `brutal` | +3 | día sobresaliente, varios objetivos |

**Aclaración**: PRO es el único atributo que puede sumar más de +1 al día.

### 6.3 Visualización

- Barras horizontales con valor entero a la derecha y botón `+1`.
- Radar chart con los 9 ejes, escala max = 15 inicialmente; se reajusta a
  20/25/30 cuando algún atributo supera el max.
- Total = suma de los 9 atributos. Visible en cabecera del panel.

---

## 7. Hidratación

### 7.1 Meta dinámica

```
meta_litros = 2.0 + 0.25 × max(0, sodio_g_total − 2.0)
```

- Base: 2 L.
- Cada gramo de sodio por encima de 2 g → +0.25 L de objetivo.
- El input acepta sal (g) o sodio (mg). Conversión: `1 g sal ≈ 0.4 g sodio`.

### 7.2 Litros efectivos ✅ CERRADO

```
litros_efectivos = Σ (litros_bebida × multiplicador_bebida)
```

| Bebida | Multiplicador |
|--------|---------------|
| Agua | **1.0** |
| Café / té sin azúcar | **0.9** |
| Refresco zero | **0.7** |
| Bebidas azucaradas | **0** (no cuentan) |
| Alcohol (cerveza, vino, destilados) | **0** (no cuenta ni penaliza) |

> Las bebidas con multiplicador 0 pueden registrarse igualmente para
> tracking, pero no contribuyen a `litros_efectivos`.

### 7.3 UI

- Barra de progreso: `litros_efectivos / meta_litros`.
- Etiqueta superior `EQUIVALENTE 0.00 L` muestra `litros_efectivos`.
- Etiqueta inferior `FALTAN X.XX L` muestra `max(0, meta − efectivos)`.
- Botones rápidos: +0.33 L, +0.5 L, +1 L, +1.5 L. Input manual.
- Cards Agua (100 %) y Refresco Zero (70 %) muestran consumo individual.

---

## 8. Modelo de retención y rango esperado ✅ CERRADO

### 8.1 Componentes

El peso báscula real fluctúa respecto al "peso teórico de grasa" por
factores de retención de agua y bolo digestivo. Solo el sodio es input
del usuario; los demás son constantes con asunción de "modo déficit".

| Componente | Origen del valor | Notas |
|------------|------------------|-------|
| Sodio | input usuario (g o mg) | sodio del día actual |
| Glucógeno (sin carbos) | constante 1.0 kg | asume modo déficit/low-carb por defecto |
| Digestivo | constante 0.3 kg | promedio de bolo alimenticio en tránsito |
| Drift baseline | derivado | informativo, no afecta al rango (ver §8.4) |

> **Nota futura (premium)**: el toggle "modo carbos" desactivará el
> componente glucógeno y permitirá editar las constantes. Fuera de scope
> inicial.

### 8.2 Fórmulas

```
ret_sodio     = 0.4 × max(0, sodio_g_hoy − 2.0)        // kg
ret_glucogeno = 1.0                                    // kg, constante
ret_digestivo = 0.3                                    // kg, constante
ret_total     = ret_sodio + ret_glucogeno + ret_digestivo
```

### 8.3 Rango esperado

```
peso_teorico_hoy = peso_inicial − (xpTotal / 7700)     // ver §9
rango_min        = peso_teorico_hoy + ret_total × 0.5
rango_max        = peso_teorico_hoy + ret_total × 1.2
```

Si `peso_bascula_hoy` queda fuera de `[rango_min, rango_max]`, badge
`FUERA DEL RANGO ↑/↓`. Si dentro, `DENTRO DEL RANGO ✓`.

### 8.4 Drift baseline (informativo)

```
baseline_drift = peso_bascula_hoy − media_7d           // signed
```

Se muestra debajo del desglose como `Media vs baseline X.X → ±Y.Y kg`. Es
solo informativo y **no se suma al `ret_total`** ni afecta al rango.

### 8.5 UI del desglose (card "RANGO ESPERADO")

Replicando las capturas:

```
RANGO ESPERADO                           modelo retención
              122.2 – 123.0 kg
                  [FUERA DEL RANGO ↑]

Retención hoy                                    +2.5 kg
  Sodio                                          +1.2 kg
  Glucógeno (sin carbos)                         +1.0 kg
  Digestivo                                      +0.3 kg
Media vs baseline 1.9                            +0.6 kg
```

- "modelo retención" en la esquina superior derecha es un link/botón a
  ayuda explicativa (Fase 13).
- Cada componente con su color (sodio amarillo, glucógeno cian,
  digestivo morado) según paleta de la captura.

---

## 9. Peso teórico y media móvil

### 9.1 Peso teórico

Cuánto debería pesar hoy si toda la XP de déficit hubiera sido grasa:

```
peso_teorico_hoy = peso_inicial − (xpTotal / 7700)
```

> Importante: el peso teórico **siempre** se divide por 7700 (kcal por kg
> de grasa), independientemente del `xpPorNivel`. Lo que escala con el
> objetivo es **cuántos niveles** representa esa pérdida, no la pérdida
> física misma.

### 9.2 Media móvil

Media aritmética de los últimos 7 pesos báscula registrados (huecos no
cuentan; si hay menos de 7, se promedian los disponibles).

### 9.3 Series de la gráfica

| Serie | Fórmula | Estilo |
|-------|---------|--------|
| Peso real | dato báscula bruto | línea naranja con puntos |
| Media 7d | media móvil 7 días | línea cian sólida |
| Rango esperado | banda `[rango_min, rango_max]` | área gris translúcida |
| Teórico XP | `peso_teorico_hoy` por día | línea verde punteada |

---

## 10. Sistema semanal y colchón

### 10.1 Semana

- Periodicidad **lunes–domingo**.
- Cada semana persiste como fila en `weeks` con `xp_total`, `estado`,
  `colchon_recibido`, `colchon_invertido`.

### 10.2 Estados

| Estado | Condición |
|--------|-----------|
| `EN CURSO` | semana actual no terminada |
| `COMPENSADA` | terminó con `xp_total ≥ 7700` gracias a inversión del colchón |
| `+XP` | terminó con `xp_total ≥ 7700` por mérito propio (excedente al colchón) |
| `DEFICIT` | terminó con `xp_total < 7700` y no se invirtió colchón (no compensa) |

### 10.3 Cálculos

```
si xp_total >= 7700:
    excedente = xp_total − 7700
    colchon  += excedente
    estado    = "+XP"

si xp_total < 7700 y se invierte colchón manualmente:
    falta     = 7700 − xp_total
    si colchon >= falta:
        colchon -= falta
        estado   = "COMPENSADA"

si xp_total < 7700 y NO se invierte colchón:
    estado    = "DEFICIT"
    // no afecta al colchón ni a la suscripción de niveles
```

> **Aclaración**: una semana en `DEFICIT` no penaliza retroactivamente, solo
> retrasa la fecha estimada de llegada a L80.

### 10.4 UI

Tabla con columnas: rango fechas, barra de progreso (naranja propio + azul
del colchón), `xp/7700`, estado. Header con `COLCHÓN +XXX` y conteo de
semanas cerradas con éxito (`7/7 OK`).

---

## 11. Camino al destino y compra de niveles

### 11.1 Compra

```
coste_compra_1_nivel = xpPorNivel
si colchon >= xpPorNivel:
    colchon       -= xpPorNivel
    nivelActual   += 1
    fecha_compra   = hoy
    flag_origen    = "COMPRADO"
sino:
    bloquear UI con mensaje "colchón insuficiente"
```

### 11.2 Visualización

- 4 cards superiores: `Nivel actual`, `Destino`, `Niveles restantes`,
  `Compradas`.
- Barra L0 → L80 con marker "AQUÍ" en `nivelActual`.
- Lista **POR VENIR**: niveles futuros con fecha estimada (ver §4.3 aplicado
  por nivel).
- Lista **CONSEGUIDOS**: histórico con fecha real y etiqueta
  `NATURAL` / `COMPRADA`.

### 11.3 Pronóstico fecha por nivel

```
para cada nivel L > nivelActual:
    semanas_hasta_L = (L − nivelActual) / nivelesPorSemana
    fecha_L         = hoy + semanas_hasta_L × 7 días
```

---

## 12. Hitos ✅ CERRADO

Lista configurable por usuario. Cada hito = `{nombre, nivel, color}`.
Al crear cuenta se siembran los **9 hitos por defecto** abajo. En premium
el usuario podrá editar nombres, colores y añadir/quitar hitos.

### 12.1 Hitos por defecto (genéricos)

| Nivel | Nombre | Color |
|-------|--------|-------|
| 5 | Primer impulso | verde claro |
| 10 | Diez derribados | verde |
| 20 | Cuarto del camino | amarillo |
| 30 | Mitad de mitad | naranja |
| 40 | Mitad del camino | rojo |
| 50 | Cuesta abajo | morado claro |
| 60 | Tres cuartos | azul |
| 70 | A la vista | cian |
| 80 | Jefe Final | morado |

### 12.2 Cálculo de "SIG. HITO"

```
sig_hito         = primer hito con nivel > nivelActual
xp_falta_hito    = (sig_hito.nivel − nivelActual) × xpPorNivel − xpEnNivel
```

Si no quedan hitos por delante (usuario en L80 con todos cumplidos), la
card muestra "JEFE FINAL SUPERADO".

---

## 13. Eventos de bitácora y registro

### 13.1 Bitácora (XP)

Cada generación de XP escribe una fila con código de tipo:

| Código | Tipo | Descripción típica |
|--------|------|---------------------|
| `[P]` | Pasos | `XXXX pasos netos × YY kg` |
| `[C]` | Calorías (déficit) | `XXXX kcal vs YYYY TDEE` |
| `[L]` | Ejercicio (Ludosport, gym, …) | `40 min · 473 kcal Polar → 331 XP (×0.7)` |
| `[H]` | Hidratación | `meta cumplida` |
| `[A]` | Atributo (PRO con XP) | `productividad brutal +3` |
| `[M]` | Manual | descripción libre |

Formato fila: `dd/mm/aa  [TIPO]  Descripción                       +XP`.

### 13.2 Registro de Atributos

Cada `+1` de atributo escribe una fila:

`dd/mm/aa  CÓDIGO  Descripción                                       +1`

Filtros: `TODO`, `FUE`, `VIT`, `DES`, `INT`, `CRE`, `ESP`, `CAR`, `HID`,
`PRO`.

---

## 14. Constantes globales

```
KCAL_POR_KG_GRASA       = 7700
NIVEL_DESTINO           = 80
KCAL_POR_PASO_FACTOR    = 0.00032
PENALIZACION_EJERCICIO  = 0.70
COEF_REFRESCO_ZERO      = 0.70
SODIO_BASE_G            = 2.0
LITROS_BASE             = 2.0
LITROS_POR_G_SODIO_EXTRA = 0.25
HIDRATACION_BONO_XP     = 50              // 🟡 a confirmar
```

Estas constantes son **globales del sistema**, idénticas para todos los
usuarios. No se versionan por usuario (a diferencia del perfil, ver §15).

---

## 15. Aislamiento por usuario y versionado

### 15.1 Datos por usuario (multi-tenant)

Toda tabla operacional (`daily_weight`, `daily_entry`, `exercise_log`,
`attribute_log`, `xp_log`, `weeks`, `milestones`) lleva `user_id NOT NULL`
con índice. Toda query de NestJS pasa por un guard que inyecta `user_id`
desde el JWT.

### 15.2 Datos globales

- Constantes de §14.
- Plantillas de hitos por defecto.
- Catálogo de actividades sugeridas para atributos.

### 15.3 Versionado del perfil

El usuario puede editar `peso_objetivo` o `factor_actividad` y eso recalcula
los derivados. Para no romper el histórico:

- Tabla `profile_version` con `valid_from`, `valid_to`.
- Cada fila de `xp_log` referencia `profile_version_id`.
- Los cálculos de niveles para histórico usan la versión vigente en cada
  fecha. Los pronósticos a futuro usan la versión actual.

---

## 16. Modelo de tiers (Free vs Premium) ✅ CERRADO en Fase 17

### 16.1 Free

- Registro, onboarding y autenticación.
- Peso báscula y media móvil 7d.
- XP por déficit calórico y pasos.
- Atributos manuales (FUE, VIT, DES, INT, CRE, ESP, CAR).
- Niveles 0–10 y barra de experiencia.
- Bitácora reciente (UI muestra los últimos 30 días por defecto, el
  backend devuelve histórico completo paginado).
- Avatar, easter eggs, modo arcade.

### 16.2 Premium

- Todo lo anterior sin limitaciones.
- **Hidratación** con meta dinámica + multiplicadores por bebida y
  atributo automático HID.
- **Productividad** automática (atributo PRO) desde la entrada
  diaria.
- **Niveles 0–80** con camino al destino y compra de niveles desde
  el colchón.
- **Gráfica de evolución de peso** con banda del rango esperado.
- **Semanas y colchón** con materialización on-demand y compensación.
- **Bitácora y registro de atributos** completos.
- **Export RGPD** (JSON con todos los datos).

### 16.3 Trial

`STRIPE_TRIAL_DAYS=14` por defecto. Se asigna `users.trial_ends_at =
now + 14d` en el `register`, **sin tarjeta**. El plan declarado en
BBDD permanece `free`, pero `effectivePlan = 'premium'` mientras el
trial esté activo.

Tras el trial, si el usuario no se ha suscrito: `effectivePlan` cae
a `free`. Los datos se preservan (no se borra nada). Al suscribirse
en el futuro, vuelve a tener acceso completo.

### 16.4 Pricing

| Periodo | Precio | Ahorro |
|---------|--------|--------|
| Mensual | 4,99 €/mes | — |
| Anual | 39,99 €/año | ≈ 33 % vs mensual |

IVA calculado automáticamente por **Stripe Tax** según país del
cliente.

### 16.5 Implementación

- **`users.plan`** (`pgEnum`): `'free' | 'premium'`. Sincronizado
  desde webhooks Stripe.
- **`users.trial_ends_at`**: timestamp del fin del trial sin tarjeta.
- **`users.stripe_customer_id`**: vinculación 1:1 con Stripe Customer.
- Tabla `subscriptions`: histórico de suscripciones Stripe.
- Tabla `billing_events`: idempotencia de webhooks vía UNIQUE en
  `stripe_event_id`.
- Decorador `@RequiresPlan('premium')` + `PlanGuard` rechaza con
  HTTP 402 a usuarios free.
- `effectivePlan` se calcula en `getMe()` y `getMyBilling()`.

### 16.6 Endpoints protegidos

Aplican `@RequiresPlan('premium')`:

- `GET /v1/charts/weight`
- `GET /v1/weeks` y `POST /v1/weeks/:id/apply-colchon`
- `GET /v1/path/destination` y `POST /v1/path/buy-level`
- `GET /v1/users/me/export`

Las cards Premium en el frontend se sustituyen por
`PremiumLockedCard` con CTA a `/pricing` cuando
`me.effectivePlan === 'free'`.

### 16.7 Skins visuales (plumbing 🟡, feature futura)

La app está preparada para soportar **skins de pago** sin refactor.
Hoy solo existe la skin `cyberpunk` (default y única). Pieza por pieza:

- **BBDD**: `users.theme_preference` (`pgEnum user_theme`). Default
  `'cyberpunk'`.
- **API**: `PUT /v1/users/me/theme` actualiza la preferencia. `me`
  incluye `themePreference`.
- **Web**: `ThemeApplier` (`apps/web/src/lib/theme.tsx`) lee
  `me.themePreference` y aplica `<html data-theme="...">`.
- **CSS**: `globals.css` tiene el bloque `@theme` (defaults
  cyberpunk) más un `:root[data-theme='cyberpunk']` documentando el
  patrón. Para añadir una skin nueva, crear otro `:root[data-theme=
  'kawaii'] { ... }` con las variables sobreescritas.

**Cómo lanzar una skin nueva (cuando llegue el momento)**:

1. Añadir el id al enum (`userThemeEnum` BBDD + `themePreferenceSchema`
   Zod).
2. Migración Drizzle.
3. Bloque CSS con los overrides de paleta/fonts.
4. Pintar selector visible en `/settings` (Premium-only si la skin es
   de pago).
5. (Si Premium) feature gate en el endpoint `PUT /v1/users/me/theme`
   con `@RequiresPlan('premium')` o validación en `AuthService.updateTheme`.

**Pricing tentativo** (sin decidir): bundle "Pack Skins" como parte
de Premium, o microtransacción de ~ 0,99 € por skin individual.

**Legal**: los nombres de skin deben ser **genéricos** (Kawaii,
Wizardry, Vaporwave, Dark Academia). NO usar marcas registradas
(Harry Potter, Pokémon, Sailor Moon, etc.) — exposición a takedown.

---

## 17. Reglas de cálculo: orden de evaluación diario

Cuando se procesa un día (al cerrar el día o al introducir un dato), el
orden de cálculos es:

1. Calcular `BMR` y `TDEE` con peso báscula del día.
2. Calcular XP por pasos, ejercicios, hidratación.
3. Calcular XP por déficit (`TDEE − kcal_in`).
4. Calcular XP por atributos automáticos (HID, PRO).
5. Sumar al `xpTotal` y recalcular `nivelActual`.
6. Recalcular `peso_teorico` y `rango_esperado`.
7. Si es domingo, cerrar la semana y aplicar reglas de §10.

Cada paso es idempotente: re-procesar un día con los mismos datos da el
mismo resultado.

---

## 18. Decisiones cerradas (Fase 0 ✅)

Todas las decisiones de dominio quedan resueltas:

- [x] Fórmula BMR (§3.1): **Mifflin–St Jeor**
- [x] Tope diario de pasos (§5.2): **25.000**
- [x] Bono XP por hidratación (§5.4): **sin XP, solo +1 a HID**
- [x] Lista definitiva de 9 atributos y criterios `+1` (§6.1): **cerrada**
- [x] Multiplicadores de bebidas (§7.2): **agua 1.0 / café-té 0.9 / zero 0.7 / alcohol 0**
- [x] Modelo de retención (§8): **solo sodio como input, glucógeno y digestivo constantes**
- [x] Lista por defecto de hitos (§12): **9 hitos cada 5–10 niveles**
- [x] Importación de histórico CSV: **NO**, la app arranca desde cero
- [x] Localización: **solo español al inicio**, i18n a futuro si hay demanda

> Cualquier cambio futuro a estas decisiones se hace primero en este
> documento, después en `packages/domain`, y se versiona en el git log
> con motivo del cambio.

---

## 19. Cambios futuros previstos (no implementar ahora)

- Integración Apple Health / Google Fit para pasos automáticos.
- Integración Polar/Garmin para kcal de ejercicio.
- Integración Renpho/básculas inteligentes para pesado automático.
- Modo "refeed" estructurado con recarga de glucógeno controlada.
- Logros/achievements desbloqueables (medallas).
- Modo competitivo / ligas entre usuarios premium.

---

*Última actualización: Fase 0 cerrada, todas las reglas validadas.*
