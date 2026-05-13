import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingFAQ } from '@/components/landing/landing-faq';
import { RedirectIfAuth } from '@/components/landing/redirect-if-auth';

export const metadata: Metadata = {
  title: 'Déficit · Pierde peso jugando',
  description:
    'Sistema RPG real para perder peso: XP por déficit calórico, 9 atributos, niveles 0-80, colchón semanal y camino visual al objetivo. Trial 14 días sin tarjeta.',
  openGraph: {
    title: 'Déficit · Pierde peso jugando',
    description:
      'Sistema RPG real para perder peso. XP, niveles 0-80, 9 atributos y colchón semanal.',
    type: 'website',
    locale: 'es_ES',
  },
};

export default function LandingPage() {
  return (
    <>
      <RedirectIfAuth />
      <div
        className="min-h-screen"
        style={{ background: 'var(--color-bg)', color: 'var(--color-fg)' }}
      >
        <LandingNav />
        <main>
          <Hero />
          <AntiHero />
          <Pillars />
          <HowItWorks />
          <FeaturesBento />
          <Comparison />
          <PricingTeaser />
          <FAQSection />
          <FinalCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// NAV
// ────────────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-sm"
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in oklch, var(--color-bg) 88%, transparent)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 font-[family-name:var(--font-vt323)]">
        <Link
          href="/"
          className="text-xl neon-glow sm:text-2xl"
          style={{ color: 'var(--color-neon-green)' }}
        >
          ▶ DEFICIT_SYS
        </Link>
        <nav className="flex items-center gap-3 text-base sm:gap-5 sm:text-lg">
          <Link
            href="#como-funciona"
            className="hidden sm:inline-block underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Cómo funciona
          </Link>
          <Link
            href="/pricing"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Precio
          </Link>
          <Link
            href="/login"
            className="hidden sm:inline-block underline-offset-4 hover:underline"
            style={{ color: 'var(--color-neon-cyan)' }}
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="border px-3 py-1 neon-glow-soft transition-all hover:scale-[1.02] focus-neon"
            style={{
              color: 'var(--color-neon-green)',
              borderColor: 'var(--color-neon-green)',
              background: 'color-mix(in oklch, var(--color-neon-green) 8%, transparent)',
            }}
          >
            [ Empezar gratis ]
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 1. HERO
// ────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <p
            className="mb-3 font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-widest sm:text-xs"
            style={{ color: 'var(--color-neon-pink)' }}
          >
            ▣ SISTEMA RPG PARA PÉRDIDA DE PESO
          </p>
          <h1
            className="font-[family-name:var(--font-vt323)] text-5xl leading-none neon-glow sm:text-6xl lg:text-7xl"
            style={{ color: 'var(--color-neon-green)' }}
          >
            Pierde peso<br />jugando.
          </h1>
          <p
            className="mt-5 font-[family-name:var(--font-vt323)] text-xl leading-relaxed sm:text-2xl"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Cada caloría que no comes es XP. Cada kilo perdido es un nivel
            ganado. Llegas a <strong style={{ color: 'var(--color-neon-purple)' }}>L80</strong>{' '}
            cuando alcanzas tu peso objetivo.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 font-[family-name:var(--font-vt323)]">
            <Link
              href="/register"
              className="border-2 px-6 py-3 text-xl neon-glow-soft transition-all hover:scale-[1.02] focus-neon"
              style={{
                color: 'var(--color-neon-green)',
                borderColor: 'var(--color-neon-green)',
                background: 'color-mix(in oklch, var(--color-neon-green) 10%, transparent)',
              }}
            >
              [ EMPEZAR GRATIS ]
            </Link>
            <Link
              href="#como-funciona"
              className="border px-6 py-3 text-xl transition-all hover:scale-[1.02] focus-neon"
              style={{
                color: 'var(--color-neon-cyan)',
                borderColor: 'var(--color-neon-cyan)',
              }}
            >
              ↓ Cómo funciona
            </Link>
          </div>
          <p
            className="mt-4 font-[family-name:var(--font-vt323)] text-base"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            14 días sin tarjeta · sin permanencia · datos exportables
          </p>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div
      className="relative border-2 p-4 font-[family-name:var(--font-vt323)] shadow-[0_0_40px_-10px_currentColor]"
      style={{
        borderColor: 'var(--color-neon-cyan)',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-neon-cyan)',
      }}
    >
      <p
        className="mb-3 font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-widest"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        ◆ dashboard
      </p>
      <MockExperienceBar />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MockNextMilestone />
        <MockRadar />
      </div>
      <div className="mt-3">
        <MockLevelPath />
      </div>
      <div
        className="absolute -right-4 -top-4 rotate-3 border-2 px-3 py-2 font-[family-name:var(--font-vt323)] text-base shadow-[0_0_24px_-4px_currentColor] sm:text-lg"
        style={{
          color: 'var(--color-neon-yellow)',
          borderColor: 'var(--color-neon-yellow)',
          background: 'var(--color-bg)',
        }}
      >
        ★ NIVEL 23 ALCANZADO
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 2. ANTI-HERO
// ────────────────────────────────────────────────────────────────────────

function AntiHero() {
  return (
    <section
      className="border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
        <h2
          className="font-[family-name:var(--font-vt323)] text-3xl leading-tight sm:text-4xl lg:text-5xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Las apps de tracking aburren.<br />
          <span style={{ color: 'var(--color-neon-red)' }}>Por eso las abandonas.</span>
        </h2>
        <p
          className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-vt323)] text-lg sm:text-xl"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          MyFitnessPal, Yazio, Lose It, Cronometer… números en pantalla, sin
          progresión visible. Pierdes peso pero{' '}
          <em style={{ color: 'var(--color-fg)' }}>no sientes</em> que estés
          perdiendo peso. La motivación se evapora en 3 semanas.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 3. PILARES
// ────────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: '✦',
    title: 'XP POR DÉFICIT',
    color: 'var(--color-neon-green)',
    desc: 'Cada caloría que no comes cuenta. El sistema calcula tu XP del día desde tu peso, BMR y pasos. Sin contar macros a mano.',
  },
  {
    icon: '◈',
    title: '9 ATRIBUTOS RPG',
    color: 'var(--color-neon-pink)',
    desc: 'Fuerza, Vitalidad, Destreza, Intelecto, Creatividad, Espíritu, Carisma, Hidratación y Productividad. Sube los que más te importan.',
  },
  {
    icon: '◇',
    title: 'COLCHÓN SEMANAL',
    color: 'var(--color-neon-cyan)',
    desc: 'Una mala semana no rompe nada. El sistema acumula XP de tus mejores semanas y compensa las flojas. Sin culpa, sin reset.',
  },
];

function Pillars() {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Tres mecánicas. <span style={{ color: 'var(--color-neon-cyan)' }}>Cero ruido.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:gap-5 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="border p-5 font-[family-name:var(--font-vt323)] transition-all hover:scale-[1.02]"
              style={{
                borderColor: p.color,
                background: `color-mix(in oklch, ${p.color} 4%, transparent)`,
                boxShadow: `0 0 18px -8px ${p.color}`,
              }}
            >
              <div
                className="text-4xl neon-glow"
                style={{ color: p.color }}
                aria-hidden="true"
              >
                {p.icon}
              </div>
              <h3
                className="mt-2 text-2xl uppercase tracking-wider"
                style={{ color: p.color }}
              >
                {p.title}
              </h3>
              <p
                className="mt-3 text-lg leading-relaxed"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 4. CÓMO FUNCIONA
// ────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Te pesas al despertar.',
    desc: 'Cualquier báscula. El sistema calcula tu XP del día desde tu peso, BMR y retención hídrica esperada.',
    color: 'var(--color-neon-orange)',
  },
  {
    n: '02',
    title: 'Apuntas pasos, hidratación, hábitos.',
    desc: 'Cada uno te sube atributos concretos. La hidratación es automática si llegas a tu meta diaria de litros.',
    color: 'var(--color-neon-cyan)',
  },
  {
    n: '03',
    title: 'Cada 7700 XP = 1 nivel.',
    desc: 'Avanzas por el camino L0 → L80 con hitos personalizables. Vas viendo cómo el peso real se acerca al teórico.',
    color: 'var(--color-neon-green)',
  },
  {
    n: '04',
    title: 'Llegas a L80 = peso objetivo.',
    desc: 'Jefe final superado. Sigues jugando para mantener: el sistema te avisa cuando sales del rango esperado.',
    color: 'var(--color-neon-purple)',
  },
];

function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Cómo funciona <span style={{ color: 'var(--color-neon-yellow)' }}>en 4 pasos.</span>
        </h2>
        <ol className="mt-10 space-y-5">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex flex-col gap-3 border p-5 sm:flex-row sm:gap-5"
              style={{
                borderColor: s.color,
                background: 'var(--color-bg)',
                boxShadow: `0 0 18px -10px ${s.color}`,
              }}
            >
              <div
                className="font-[family-name:var(--font-press-start)] text-3xl shrink-0 neon-glow sm:text-4xl"
                style={{ color: s.color }}
              >
                {s.n}
              </div>
              <div className="font-[family-name:var(--font-vt323)]">
                <h3
                  className="text-2xl"
                  style={{ color: s.color }}
                >
                  {s.title}
                </h3>
                <p
                  className="mt-1 text-lg leading-relaxed"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 5. FEATURES BENTO
// ────────────────────────────────────────────────────────────────────────

function FeaturesBento() {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Esto es <span style={{ color: 'var(--color-neon-pink)' }}>lo que ves cada día.</span>
        </h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          <BentoCard
            className="lg:col-span-2"
            tone="var(--color-neon-orange)"
            title="EVOLUCIÓN DEL PESO"
            desc="Banda gris del rango esperado, peso real, media móvil 7 días y peso teórico calculado desde tu XP. Sabes si vas bien sin pensar."
          >
            <MockWeightChart />
          </BentoCard>
          <BentoCard
            tone="var(--color-neon-pink)"
            title="RADAR DE ATRIBUTOS"
            desc="9 stats RPG en un golpe de vista. ¿Dónde estás flojo? ¿Qué cuidas más?"
          >
            <MockRadar />
          </BentoCard>
          <BentoCard
            tone="var(--color-neon-cyan)"
            title="BITÁCORA"
            desc="Cada evento queda registrado: peso, déficit, hidratación, hábito. Tu historial completo, exportable."
          >
            <MockBitacora />
          </BentoCard>
          <BentoCard
            tone="var(--color-neon-purple)"
            title="CAMINO L0 → L80"
            desc="Recorrido completo con marker AQUÍ. Fechas estimadas para los próximos niveles según tu ritmo real."
          >
            <MockPath />
          </BentoCard>
          <BentoCard
            tone="var(--color-neon-yellow)"
            title="NIVEL ALCANZADO"
            desc="Overlay neón fullscreen cuando subes de nivel. Pequeño momento de subidón, justo lo que falta en otras apps."
          >
            <MockLevelUp />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  className,
  tone,
  title,
  desc,
  children,
}: {
  className?: string;
  tone: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col border p-4 font-[family-name:var(--font-vt323)] transition-all hover:scale-[1.01] ${className ?? ''}`}
      style={{
        borderColor: tone,
        background: `color-mix(in oklch, ${tone} 3%, var(--color-bg-elevated))`,
        boxShadow: `0 0 18px -10px ${tone}`,
      }}
    >
      <h3
        className="text-xl uppercase tracking-wider neon-glow"
        style={{ color: tone }}
      >
        {title}
      </h3>
      <div className="my-3 flex-1">{children}</div>
      <p className="text-base" style={{ color: 'var(--color-fg-muted)' }}>
        {desc}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 6. COMPARATIVA
// ────────────────────────────────────────────────────────────────────────

const ROWS = [
  { feature: 'XP por déficit calórico', deficit: true, mfp: false, hab: false, yazio: false },
  { feature: '9 atributos RPG enfocados', deficit: true, mfp: false, hab: 'parcial', yazio: false },
  { feature: 'Colchón semanal sin culpa', deficit: true, mfp: false, hab: false, yazio: false },
  { feature: 'Camino L0 → L80 visual', deficit: true, mfp: false, hab: false, yazio: false },
  { feature: 'Banda de rango esperado', deficit: true, mfp: false, hab: false, yazio: false },
  { feature: 'Tracking de peso clásico', deficit: true, mfp: true, hab: false, yazio: true },
  { feature: 'Estética cyberpunk neón', deficit: true, mfp: false, hab: false, yazio: false },
] as const;

function Comparison() {
  return (
    <section
      className="border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Qué hace <span style={{ color: 'var(--color-neon-green)' }}>distinto</span> a Déficit.
        </h2>
        <p
          className="mt-3 text-center font-[family-name:var(--font-vt323)] text-base"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Sin trampas. Hay cosas que las otras hacen mejor; éstas son las nuestras.
        </p>
        <div className="mt-8 overflow-x-auto border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full font-[family-name:var(--font-vt323)] text-base">
            <thead
              style={{
                background: 'var(--color-bg)',
                color: 'var(--color-fg-muted)',
              }}
            >
              <tr>
                <th className="px-3 py-2 text-left text-lg">Característica</th>
                <th className="px-3 py-2 text-center" style={{ color: 'var(--color-neon-green)' }}>
                  Déficit
                </th>
                <th className="px-3 py-2 text-center">MyFitnessPal</th>
                <th className="px-3 py-2 text-center">Habitica</th>
                <th className="px-3 py-2 text-center">Yazio</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr
                  key={r.feature}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-3 py-2 text-lg">{r.feature}</td>
                  <Cell v={r.deficit} highlight />
                  <Cell v={r.mfp} />
                  <Cell v={r.hab} />
                  <Cell v={r.yazio} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({ v, highlight = false }: { v: boolean | string; highlight?: boolean }) {
  let glyph = '—';
  let color = 'var(--color-fg-subtle)';
  if (v === true) {
    glyph = '✓';
    color = highlight ? 'var(--color-neon-green)' : 'var(--color-fg-muted)';
  } else if (v === 'parcial') {
    glyph = '~';
    color = 'var(--color-neon-orange)';
  }
  return (
    <td className="px-3 py-2 text-center text-xl" style={{ color }}>
      {glyph}
    </td>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 7. PRICING TEASER
// ────────────────────────────────────────────────────────────────────────

function PricingTeaser() {
  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Empieza <span style={{ color: 'var(--color-neon-green)' }}>gratis</span>. Sube si te engancha.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PriceCard
            tone="var(--color-fg-muted)"
            tag="FREE"
            price="0 €"
            cycle="para siempre"
            highlights={[
              'Peso báscula + XP por déficit',
              '7 atributos manuales',
              'Niveles 0-10',
              'Bitácora reciente',
            ]}
            cta="Empezar gratis"
            href="/register"
          />
          <PriceCard
            tone="var(--color-neon-purple)"
            tag="PREMIUM"
            price="4,99 €"
            cycle="al mes · trial 14 días sin tarjeta"
            highlights={[
              'Todo lo de Free, sin límites',
              'Hidratación + Productividad automáticas',
              'Gráfica de evolución + colchón',
              'Camino L0-L80 + compra de niveles',
              'Niveles 0-80 completos',
            ]}
            cta="Probar Premium"
            href="/pricing"
            featured
          />
        </div>
        <p
          className="mt-6 text-center font-[family-name:var(--font-vt323)] text-base"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          ¿Necesitas detalle? <Link href="/pricing" className="underline" style={{ color: 'var(--color-neon-cyan)' }}>Comparativa completa →</Link>
        </p>
      </div>
    </section>
  );
}

function PriceCard({
  tone,
  tag,
  price,
  cycle,
  highlights,
  cta,
  href,
  featured = false,
}: {
  tone: string;
  tag: string;
  price: string;
  cycle: string;
  highlights: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div
      className="flex flex-col border-2 p-5 font-[family-name:var(--font-vt323)]"
      style={{
        borderColor: tone,
        background: featured
          ? `color-mix(in oklch, ${tone} 6%, transparent)`
          : 'var(--color-bg-elevated)',
        boxShadow: featured ? `0 0 28px -10px ${tone}` : 'none',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="font-[family-name:var(--font-press-start)] text-xs uppercase tracking-widest"
          style={{ color: tone }}
        >
          ▣ {tag}
        </span>
        {featured && (
          <span
            className="font-[family-name:var(--font-press-start)] text-[9px] uppercase"
            style={{ color: 'var(--color-neon-yellow)' }}
          >
            ★ recomendado
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-5xl neon-glow" style={{ color: tone }}>
          {price}
        </span>
      </div>
      <p
        className="mt-1 text-sm"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {cycle}
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-lg">
        {highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span style={{ color: tone }}>›</span>
            <span style={{ color: 'var(--color-fg-muted)' }}>{h}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-5 border px-4 py-3 text-center text-xl uppercase tracking-widest transition-all hover:scale-[1.02] focus-neon"
        style={{
          color: tone,
          borderColor: tone,
          background: `color-mix(in oklch, ${tone} 8%, transparent)`,
        }}
      >
        [ {cta} ]
      </Link>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 8. FAQ
// ────────────────────────────────────────────────────────────────────────

function FAQSection() {
  return (
    <section
      className="border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <h2
          className="text-center font-[family-name:var(--font-vt323)] text-3xl sm:text-4xl"
          style={{ color: 'var(--color-fg)' }}
        >
          Preguntas <span style={{ color: 'var(--color-neon-cyan)' }}>habituales.</span>
        </h2>
        <div className="mt-8">
          <LandingFAQ />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 9. CTA FINAL
// ────────────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <p
          className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-widest sm:text-xs"
          style={{ color: 'var(--color-neon-yellow)' }}
        >
          ◆ FIN DE LA DEMO
        </p>
        <h2
          className="mt-4 font-[family-name:var(--font-vt323)] text-4xl leading-tight neon-glow sm:text-5xl lg:text-6xl"
          style={{ color: 'var(--color-neon-green)' }}
        >
          L0 te está esperando.
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-vt323)] text-xl"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Crea tu personaje en 30 segundos. Empieza con 14 días gratis de
          Premium, sin tarjeta, sin permanencia.
        </p>
        <div className="mt-7">
          <Link
            href="/register"
            className="inline-block border-2 px-8 py-4 font-[family-name:var(--font-vt323)] text-2xl uppercase tracking-widest neon-glow-soft transition-all hover:scale-[1.03] focus-neon"
            style={{
              color: 'var(--color-neon-green)',
              borderColor: 'var(--color-neon-green)',
              background: 'color-mix(in oklch, var(--color-neon-green) 10%, transparent)',
            }}
          >
            [ CREAR MI PERSONAJE ]
          </Link>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 10. FOOTER
// ────────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer
      className="border-t px-4 py-8 font-[family-name:var(--font-vt323)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="text-lg neon-glow"
            style={{ color: 'var(--color-neon-green)' }}
          >
            ▶ DEFICIT_SYS
          </span>
          <span
            className="text-sm"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            © Déficit · v0.0.0
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-base">
          <Link
            href="/pricing"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Precio
          </Link>
          <Link
            href="/legal/terminos"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Términos
          </Link>
          <Link
            href="/legal/privacidad"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Privacidad
          </Link>
          <Link
            href="/legal/cookies"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Cookies
          </Link>
          <Link
            href="/login"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--color-neon-cyan)' }}
          >
            Entrar
          </Link>
        </nav>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MOCKS visuales (SVG / divs) que imitan las cards reales del dashboard.
// No son screenshots — se renderizan en el cliente con CSS puro.
// ────────────────────────────────────────────────────────────────────────

function MockExperienceBar() {
  return (
    <div className="border p-3" style={{ borderColor: 'var(--color-neon-yellow)' }}>
      <div className="flex items-baseline justify-between text-base">
        <span
          className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--color-neon-yellow)' }}
        >
          ◆ EXPERIENCIA
        </span>
        <span style={{ color: 'var(--color-neon-yellow)' }}>L23 → L24</span>
      </div>
      <div
        className="mt-2 h-4 w-full overflow-hidden border"
        style={{ borderColor: 'var(--color-neon-yellow)' }}
      >
        <div
          className="h-full neon-shimmer"
          style={{
            width: '64%',
            color: 'var(--color-neon-yellow)',
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        <span>4 928 / 7 700 XP</span>
        <span>~3 d</span>
      </div>
    </div>
  );
}

function MockNextMilestone() {
  return (
    <div
      className="border p-3 text-base"
      style={{ borderColor: 'var(--color-neon-red)', color: 'var(--color-neon-red)' }}
    >
      <p
        className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-widest"
        style={{ color: 'var(--color-neon-red)' }}
      >
        ⚑ PRÓXIMO HITO
      </p>
      <p className="mt-2 text-xl leading-tight">EL VIAJE</p>
      <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        L25 · faltan 2 772 XP
      </p>
    </div>
  );
}

function MockRadar() {
  // Polígono 9 lados con valores 10-22.
  const values = [18, 12, 15, 22, 14, 10, 16, 20, 13];
  const center = 60;
  const radius = 48;
  const points = values
    .map((v, i) => {
      const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
      const r = (v / 25) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');
  const outerPoints = Array.from({ length: 9 })
    .map((_, i) => {
      const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 120 120"
      className="mx-auto"
      style={{ width: '100%', maxWidth: 160, height: 'auto' }}
      aria-hidden="true"
    >
      <polygon
        points={outerPoints}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="0.5"
      />
      <polygon
        points={points}
        fill="color-mix(in oklch, var(--color-neon-pink) 25%, transparent)"
        stroke="var(--color-neon-pink)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function MockLevelPath() {
  const filled = 23; // de 80
  return (
    <div>
      <div className="flex items-baseline justify-between text-base">
        <span
          className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--color-neon-purple)' }}
        >
          ▦ CAMINO L0 → L80
        </span>
        <span style={{ color: 'var(--color-neon-purple)' }}>
          {Math.round((filled / 80) * 100)}%
        </span>
      </div>
      <div className="mt-2 flex h-3 gap-[1px]">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              background:
                i < filled
                  ? 'var(--color-neon-purple)'
                  : 'var(--color-bg-overlay)',
              opacity: i < filled ? 1 : 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MockWeightChart() {
  return (
    <svg
      viewBox="0 0 200 100"
      className="w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="band" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-fg-subtle)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--color-fg-subtle)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M 0 35 L 20 36 L 40 33 L 60 34 L 80 30 L 100 32 L 120 28 L 140 25 L 160 22 L 180 19 L 200 16
           L 200 60 L 180 63 L 160 65 L 140 67 L 120 69 L 100 72 L 80 74 L 60 76 L 40 79 L 20 80 L 0 82 Z"
        fill="url(#band)"
      />
      <path
        d="M 0 50 L 20 52 L 40 48 L 60 53 L 80 47 L 100 50 L 120 45 L 140 43 L 160 40 L 180 36 L 200 33"
        fill="none"
        stroke="var(--color-neon-orange)"
        strokeWidth="1.5"
      />
      <path
        d="M 0 55 L 20 54 L 40 52 L 60 50 L 80 48 L 100 46 L 120 44 L 140 42 L 160 39 L 180 36 L 200 33"
        fill="none"
        stroke="var(--color-neon-cyan)"
        strokeWidth="1"
      />
      <path
        d="M 0 58 L 200 26"
        fill="none"
        stroke="var(--color-neon-green)"
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
    </svg>
  );
}

function MockBitacora() {
  const lines = [
    { type: 'P', color: 'var(--color-neon-orange)', text: 'Peso 78.4 kg', xp: '+412' },
    { type: 'C', color: 'var(--color-neon-cyan)', text: '8 240 pasos', xp: '+86' },
    { type: 'H', color: 'var(--color-neon-blue)', text: 'Meta hidratación', xp: '+25' },
    { type: 'A', color: 'var(--color-neon-pink)', text: 'Sumó VIT', xp: '+10' },
  ];
  return (
    <div className="space-y-1 text-base">
      {lines.map((l, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 border-b py-1 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-5 text-center font-[family-name:var(--font-press-start)] text-[9px]"
              style={{ color: l.color }}
            >
              {l.type}
            </span>
            <span style={{ color: 'var(--color-fg-muted)' }}>{l.text}</span>
          </span>
          <span style={{ color: l.color }}>{l.xp}</span>
        </div>
      ))}
    </div>
  );
}

function MockPath() {
  return (
    <div className="text-base">
      <div className="flex items-baseline justify-between">
        <span style={{ color: 'var(--color-fg-muted)' }}>L0</span>
        <span style={{ color: 'var(--color-neon-purple)' }}>AQUÍ ▼</span>
        <span style={{ color: 'var(--color-fg-muted)' }}>L80</span>
      </div>
      <div className="relative mt-2 h-5 w-full overflow-hidden border" style={{ borderColor: 'var(--color-neon-purple)' }}>
        <div
          className="h-full neon-shimmer"
          style={{ width: '29%', color: 'var(--color-neon-purple)' }}
        />
        <div
          className="absolute top-0 h-full w-[2px]"
          style={{ left: '29%', background: 'var(--color-neon-yellow)' }}
        />
      </div>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-subtle)' }}>
        Llegada estimada: <span style={{ color: 'var(--color-neon-purple)' }}>Oct 2026</span>
      </p>
    </div>
  );
}

function MockLevelUp() {
  return (
    <div
      className="relative flex h-full items-center justify-center border-2 p-4"
      style={{
        borderColor: 'var(--color-neon-yellow)',
        background: 'color-mix(in oklch, var(--color-neon-yellow) 6%, transparent)',
        boxShadow: '0 0 24px -8px var(--color-neon-yellow)',
      }}
    >
      <div className="text-center">
        <p
          className="font-[family-name:var(--font-press-start)] text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--color-neon-yellow)' }}
        >
          ★ LEVEL UP
        </p>
        <p
          className="mt-2 font-[family-name:var(--font-vt323)] text-3xl neon-glow"
          style={{ color: 'var(--color-neon-yellow)' }}
        >
          NIVEL 24
        </p>
        <p
          className="font-[family-name:var(--font-vt323)] text-sm"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          alcanzado · +1 atributo libre
        </p>
      </div>
    </div>
  );
}
