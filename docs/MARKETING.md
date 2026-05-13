# MARKETING.md — SEO, contenido y redes sociales

Plan accionable para que Déficit aparezca en buscadores y crezca
orgánicamente. Pensado para un solo founder con tiempo limitado y
cero presupuesto inicial.

---

## 1. SEO técnico (lo que ya está hecho)

Ya implementado en el código:

- **Metadata**: title template, description, keywords España,
  `metadataBase`, `alternates.canonical` por página, `robots`,
  `openGraph` con `locale: es_ES`, `twitter` cards, `verification`
  con env var.
- **Structured data (JSON-LD)**: `Organization`, `SoftwareApplication`
  (con offers Free y Premium) y `FAQPage` con las 8 preguntas.
  Habilita rich results en Google (estrellas, precios, FAQ
  desplegable directamente en SERP).
- **Sitemap**: `app/sitemap.ts` indexa `/`, `/pricing`, `/register`,
  `/login`, `/legal/*`.
- **Robots**: `app/robots.ts` permite todo lo indexable y excluye
  `/app`, `/admin`, `/settings`, `/onboarding`, `/verify-email`,
  `/forgot-password`, `/reset-password`.
- **OpenGraph image**: `app/opengraph-image.tsx` genera 1200x630
  con Δ + tagline al compartir el link.
- **Performance**: Next.js 15 SSR, fuentes Google con `display:swap`,
  cero imágenes pesadas (todo SVG inline), edge runtime en
  ImageResponse. Espera buen LCP / CLS / INP.
- **A11y**: skip-link, `lang="es"`, `prefers-reduced-motion`, focus
  ring neón. Lighthouse a11y debe puntuar > 90.

---

## 2. SEO técnico pendiente (operacional, requiere despliegue)

Cuando esté el dominio real apuntando al VPS:

1. **Comprar dominio**: `deficit.app` recomendado (corto, memorable,
   gTLD `.app` requiere HTTPS forzado en Chrome — ya lo tendrás).
2. **Variables de entorno en producción**:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://deficit.app
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<token>
   ```
3. **Google Search Console**:
   - Dar de alta `deficit.app` como propiedad de dominio.
   - Verificar con el meta tag (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`)
     o DNS TXT.
   - Enviar `https://deficit.app/sitemap.xml`.
   - Revisar cobertura semanal los primeros 3 meses.
4. **Bing Webmaster Tools**: importa la propiedad desde Search
   Console en 2 clicks. Bing manda menos tráfico pero es gratis.
5. **Google Analytics 4** o **Plausible** (recomendado por
   privacidad). Decidir antes de lanzar.

---

## 3. Keywords objetivo (España)

### Primarias (alta intención, alta competencia)

| Keyword | Búsquedas/mes ES | Dificultad | Donde colocarla |
|---------|------------------|------------|-----------------|
| déficit calórico | ~40 000 | Alta | Title, H1 implícito, meta |
| perder peso | ~200 000 | Muy alta | Description, body |
| app perder peso | ~5 000 | Media | Title, H1 |
| contador de calorías | ~12 000 | Alta | Blog futuro |
| calcular déficit calórico | ~8 000 | Media | Blog: calculadora |

### Secundarias (long-tail, baja competencia, alta conversión)

| Keyword | Por qué | Donde |
|---------|---------|-------|
| alternativa myfitnesspal español | Buscadores frustrados | Comparativa, blog |
| habitica para perder peso | Gamers de hábitos | Comparativa, blog |
| app fitness con xp | Nicho gamer-fitness | H1 secundario, blog |
| pesarse todos los días | Hábito core del producto | FAQ, blog |
| déficit calórico sin contar calorías | Diferenciador | Tagline secundario |
| app pérdida peso gamificada | Búsqueda exacta del producto | Title alterno |
| qué es el peso teórico | Concepto interno del producto | Blog |
| colchón calórico semanal | Concepto único | Blog |

### Estrategia

- **Página `/` (landing)**: ataca "perder peso" + "déficit calórico"
  + "app gamificada".
- **Página `/pricing`**: ataca "déficit calórico precio" +
  "alternativa myfitnesspal premium".
- **Blog futuro `/blog/<slug>`** (Fase opcional): un artículo por
  keyword secundaria. Esto es lo que de verdad trae tráfico SEO.

---

## 4. Estrategia de contenido (blog `/blog`)

**No lanzar todavía** — primero validar tracción con la landing y
redes. Cuando exista tráfico inicial (50-100 visitas/día), montar el
blog en MDX (mismo stack que las páginas legales).

### Artículos seed (los 10 primeros)

Ordenados por **ratio dificultad/tráfico** (fáciles de rankear,
buen volumen):

1. **"¿Qué es el déficit calórico y cómo se calcula en 2026?"**
   — atrae a quien todavía no conoce el concepto.
2. **"Calculadora de BMR y TDEE gratis"** — herramienta interactiva
   (no requiere registro). Genera backlinks fácilmente.
3. **"Alternativas a MyFitnessPal en español: 7 apps en 2026"** —
   tu app aparece comparada. Tráfico de búsquedas competidoras.
4. **"Cómo pesarse correctamente: la regla de la mañana"** — hábito
   core del producto.
5. **"Por qué bajas de peso pero la báscula no se mueve (retención
   hídrica explicada)"** — concepto interno del producto.
6. **"Habitica vs gamificación específica de pérdida de peso"** —
   comparativa long-tail.
7. **"Cuánto déficit calórico es seguro: la zona 200-700 kcal"** —
   educacional con sustento médico.
8. **"Por qué la mayoría abandona MyFitnessPal en 3 semanas"** —
   psicología de hábitos + intro a gamificación.
9. **"BMR para mujeres vs hombres: fórmula Mifflin-St Jeor"** —
   técnico, búsqueda alta intención.
10. **"Recomposición corporal sin contar macros: cómo funciona el
    peso teórico"** — concepto único del producto.

### Estructura de cada artículo

- **Mínimo 1 200 palabras** (Google premia profundidad para fitness).
- **H1 con keyword exacta** + H2/H3 con variantes long-tail.
- **TL;DR** al inicio (140 chars).
- **Tabla o lista** en los primeros 300 chars (featured snippet).
- **FAQ al final** con 3-5 preguntas (más rich results).
- **CTA al final**: "Prueba el sistema en Déficit · 14 días gratis".
- **Imagen OG propia** generada con `ImageResponse` (mismo patrón
  que la landing).

### Cadencia

- **Mes 1-3**: 1 artículo / semana (10 artículos seed completados).
- **Mes 4-6**: 1 artículo / 2 semanas (15 más, long-tail).
- **Mes 7+**: depende de tráfico y feedback.

---

## 5. Backlinks (off-page SEO)

Lo más difícil pero lo más valioso. Sin backlinks, tu blog no rankea
aunque sea perfecto.

### Tácticas accionables (low-effort, sin spam)

1. **Product Hunt** (lanzamiento): preparar un día específico,
   normalmente martes/miércoles 0:01 UTC. Necesitas ~30 amigos que
   voten en las primeras 2 horas. Si llegas a top 5 del día, tienes
   200-500 visitas + 1-3 backlinks naturales.
2. **Reddit**:
   - `r/loseit` (500k subs, España + LATAM): post de **historia
     personal**, no anuncio. "Construí mi propia app porque las
     existentes me aburrían" funciona.
   - `r/Spain`, `r/españa`: solo cuando tengas algo realmente útil
     que aportar.
   - `r/gamification`: comunidad de nicho, muy receptiva.
   - `r/selfhosted`: solo cuando documentes la parte open-source.
3. **Foros españoles**:
   - Forocoches sección "Fitness y Nutrición": muy nicho pero alto
     tráfico. Hilo "He creado X" funciona bien.
   - Mediavida: similar.
4. **Hilos en X / Twitter** explicando decisiones técnicas: "He
   construido un SaaS de pérdida de peso en Next.js + NestJS, esto
   es lo que he aprendido". Atrae a otros founders → backlinks
   técnicos.
5. **Hacker News** (Show HN): un solo intento. Ojo: HN es
   tech-savvy, valoran honestidad sobre marketing.
6. **Indie Hackers**: comunidad de SaaS founders. Postea sobre tu
   journey, no sobre la app directamente.
7. **Directorios de SaaS gratuitos**: SaaSHub, AlternativeTo,
   Capterra. 30 min de trabajo, backlinks duraderos.

### Backlinks a evitar

- Comprar backlinks (Fiverr, Upwork, etc.): Google los detecta y
  penaliza.
- Comment spam en blogs ajenos: cero valor SEO desde 2015.
- Press release pagado (en España: poca calidad, mucho dinero).

---

## 6. Redes sociales por canal

Cada red tiene reglas, audiencia y formato distintos. **No intentes
estar en todas**. Empieza con 2 y mantén la consistencia.

### TikTok (recomendado #1 para Déficit)

**Por qué encaja**: la estética cyberpunk + RPG + level-ups visuales
es **inherentemente viral**. Es contenido que la gente comparte.

**Tipo de contenido** (1-2 vídeos / semana):

1. **Level-up reactions**: graba la pantalla cuando subes de nivel,
   con el `LevelUpOverlay` neón. Caption: "Bajar 3kg = subir 2
   niveles. Mi app". 15-30 seg.
2. **Antes/después dashboard**: muestra Path L0→L80 con marker
   moviéndose semana a semana.
3. **Behind-the-scenes** del código: builder vibe, "construyendo un
   SaaS de pérdida de peso en TypeScript". Atrae founders + curiosos.
4. **Mini-explicaciones**: "Por qué el peso sube y baja 1kg en un
   día" + animación de la card de retención.
5. **Reacciones a apps competidoras**: "Probando MyFitnessPal en
   2026 vs mi alternativa". Cuidado con las marcas registradas en
   thumbnails.

**Hashtags ES**: `#perderpeso #deficitcalorico #fitness #rpg
#programación #saas #indiehacker #españa`.

**Hora de publicación**: 19-22h España (mayor engagement).

### Reddit (recomendado #2)

**Por qué encaja**: la audiencia de loseit + gamification + selfhost
es exactamente tu ICP.

**Estrategia**:
- Primero **aporta valor 1 mes sin promocionar nada**. Comenta en
  posts ajenos con consejos genuinos.
- Después un post propio: "He construido X porque las apps existentes
  me aburrían". Honesto, no spammy.
- Si te banean: aceptarlo. No volver a publicar enseguida.

### Twitter / X (build in public)

**Por qué encaja**: comunidad indie hacker activa, ratio buena de
backlinks técnicos.

**Estrategia**:
- Hilo semanal con métricas: MRR, usuarios, retención. Aunque sean
  pequeñas.
- Threads explicando decisiones técnicas concretas (Drizzle,
  packages workspace, sistema de XP).
- Responder a @indiehackers, @marc_louvion, @pieterlevels.

### Instagram (opcional)

Menos efectivo para SaaS B2C español. Solo si ya tienes contenido
de TikTok y reposteas en Reels. No invertir tiempo neto adicional.

### YouTube (largo plazo)

Si llegas a 200+ usuarios y tienes ancho de banda, hacer una serie
"Construyendo Déficit": cada vídeo cubre una decisión técnica o de
producto. Vídeos largos rankean en Google también, doble efecto SEO.

---

## 7. Cronograma sugerido (primeros 6 meses)

| Mes | Foco principal | KPI a vigilar |
|-----|----------------|---------------|
| 1 | Lanzamiento landing + perfiles redes + Product Hunt | Visitas/día, signups |
| 2 | 4 vídeos TikTok + 2 posts Reddit + 1 hilo X / sem | Followers, signups |
| 3 | Empezar blog (4 artículos seed) + Search Console | Impresiones SERP |
| 4 | Más blog (4 más) + iterar contenido viral | Posición keywords |
| 5 | Optimizar landing según datos reales + screenshots | Conversión visit→signup |
| 6 | Decidir si invertir en Apple Search Ads + SEO técnico avanzado | MRR, retención 30d |

---

## 8. Cuándo invertir dinero

**Antes de tener 100 usuarios pagando**: cero presupuesto. Todo
orgánico (contenido + comunidades).

**Entre 100-500 premium**: presupuesto modesto:
- 50-100 €/mes en herramientas: Ahrefs Lite o Ubersuggest, Plausible.
- 0 € en ads todavía.

**Más de 500 premium**:
- Apple Search Ads (gente buscando "déficit calórico" en App Store
  cuando tengas app nativa).
- Reddit Ads en `r/loseit` (CPM bajo, audiencia perfecta).
- Influencers de nicho fitness español (microinfluencers 10-50k
  followers, 200-500 €/colaboración).

**Nunca o casi nunca**: Google Ads para keywords competitivas
("perder peso", "déficit"). CPC > 2 €, payback brutal.

---

## 9. Métricas que importan

Sin obsesionarse, vigilar mensualmente:

- **Impresiones en Google** (Search Console): si crece, SEO funciona.
- **CTR por keyword**: si < 2 %, mejorar title/description.
- **Visitas únicas /día** (Plausible): el norte estrella.
- **Conversión visitante → signup**: objetivo > 3 % para SaaS
  fitness.
- **Conversión signup → premium trial activated**: > 60 % es bueno.
- **Retención 30 días**: > 40 % indica producto sano.

---

## 10. Recursos útiles

- **Ahrefs Webmaster Tools** (gratis): keywords, backlinks de tu
  sitio.
- **Google Trends**: validar interés estacional ("déficit calórico"
  pica en enero + después de verano).
- **AnswerThePublic**: ideas de artículos a partir de keyword seed.
- **Schema.org Validator**: comprobar que los JSON-LD están bien.
- **Google Rich Results Test**: ver qué rich results activa tu
  página.
- **PageSpeed Insights**: comprobar Core Web Vitals tras desplegar.
