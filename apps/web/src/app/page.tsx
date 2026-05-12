'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AvatarFrame } from '@/components/avatar/avatar-frame';
import { FiveClickEasterEgg } from '@/components/easter-eggs';
import { AttributesRadar } from '@/components/dashboard/attributes-radar';
import { BitacoraCard } from '@/components/dashboard/bitacora-card';
import { DailyInputTabs } from '@/components/dashboard/daily-input-tabs';
import { ExperienceCard } from '@/components/dashboard/experience-card';
import { LevelPathCard } from '@/components/dashboard/level-path-card';
import { LevelUpOverlay, useLevelUp } from '@/components/dashboard/level-up-overlay';
import { NextMilestoneCard } from '@/components/dashboard/next-milestone-card';
import { PathCard } from '@/components/dashboard/path-card';
import { PremiumLockedCard } from '@/components/dashboard/premium-locked-card';
import { RangeCard } from '@/components/dashboard/range-card';
import { RegistroAtributosCard } from '@/components/dashboard/registro-atributos-card';
import { TrialBanner } from '@/components/dashboard/trial-banner';
import { VerifyEmailBanner } from '@/components/dashboard/verify-email-banner';
import { WeeksCard } from '@/components/dashboard/weeks-card';
import { WeightCard } from '@/components/dashboard/weight-card';
import { WeightChartCard } from '@/components/dashboard/weight-chart-card';
import { AppShell } from '@/components/layout/app-shell';
import { NeonCard, NeonStat } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-provider';

export default function HomePage() {
  const { api, me, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.getMyProfile(),
    enabled: isAuthenticated && me?.hasProfile === true,
  });

  const headerQuery = useQuery({
    queryKey: queryKeys.dashboardHeader,
    queryFn: () => api.getDashboardHeader(),
    enabled: isAuthenticated && me?.hasProfile === true,
  });

  const xpQuery = useQuery({
    queryKey: queryKeys.xpSummary,
    queryFn: () => api.getXpSummary(),
    enabled: isAuthenticated && me?.hasProfile === true,
  });

  const attributesQuery = useQuery({
    queryKey: queryKeys.attributes,
    queryFn: () => api.getAttributes(),
    enabled: isAuthenticated && me?.hasProfile === true,
  });

  const isPremium = me?.effectivePlan === 'premium';

  const weeksQuery = useQuery({
    queryKey: queryKeys.weeks,
    queryFn: () => api.getWeeks(),
    enabled: isAuthenticated && me?.hasProfile === true && isPremium,
  });

  const pathQuery = useQuery({
    queryKey: queryKeys.pathDestination,
    queryFn: () => api.getPathDestination(),
    enabled: isAuthenticated && me?.hasProfile === true && isPremium,
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (me && !me.hasProfile) {
      router.push('/onboarding');
    }
  }, [loading, isAuthenticated, me, router]);

  const { levelUp, dismiss: dismissLevelUp } = useLevelUp(
    xpQuery.data?.nivelActual ?? -1,
    me?.id,
  );

  if (
    loading ||
    !me ||
    !profileQuery.data ||
    !headerQuery.data ||
    !xpQuery.data ||
    !attributesQuery.data ||
    (isPremium && (!weeksQuery.data || !pathQuery.data))
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p
          className="text-2xl font-[family-name:var(--font-vt323)] terminal-cursor"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          ▶ inicializando
        </p>
      </main>
    );
  }

  const profile = profileQuery.data;
  const header = headerQuery.data;
  const xp = xpQuery.data;
  const attributes = attributesQuery.data;
  const weeksData = weeksQuery.data;
  const pathData = pathQuery.data;
  const sinPesos = header.pesoFecha === null;
  const hitosAlcanzados = xp.hitos.filter((h) => h.alcanzado).length;
  const hitosTotal = xp.hitos.length || 9;

  return (
    <AppShell
      sidebar={
        <>
          <FiveClickEasterEgg>
            <AvatarFrame
              avatarId={me.avatarId}
              caption={me.email.split('@')[0]?.toUpperCase()}
              captionRight={`NVL ${xp.nivelActual}-80`}
              footerLeft="LUDOTEMPLO"
              footerRight={`${hitosAlcanzados}/${hitosTotal}`}
            />
          </FiveClickEasterEgg>
          <NeonCard tone="green" title="STATS" symbol=",">
            <div className="space-y-1">
              <NeonStat label="Racha" value={`${xp.stats.rachaDias} d`} tone="orange" />
              <NeonStat label="Hoy" value={`${xp.stats.xpHoy} xp`} tone="orange" />
              <NeonStat
                label="Media"
                value={`${Math.round(xp.stats.xpMediaDia)} xp`}
                tone="orange"
              />
              <NeonStat label="BMR" value={`${Math.round(xp.stats.bmr)} kc`} tone="orange" />
              <NeonStat
                label="Semana"
                value={
                  <>
                    <span>{xp.stats.xpSemanaActual}</span>
                    <span style={{ color: 'var(--color-fg-subtle)' }}>/7700</span>
                  </>
                }
                tone="orange"
              />
              <NeonStat
                label="Colchón"
                value={`+${xp.stats.colchon} xp`}
                tone="cyan"
              />
            </div>
          </NeonCard>
          <NeonCard tone="muted" title="PERFIL" symbol="◆" glow={false}>
            <div className="space-y-1 text-base">
              <NeonStat
                label="Inicio"
                value={`${profile.pesoInicialKg} kg`}
                valueClass="text-[color:var(--color-neon-orange)]"
              />
              <NeonStat
                label="Objetivo"
                value={`${profile.pesoObjetivoKg} kg`}
                valueClass="text-[color:var(--color-neon-orange)]"
              />
              <NeonStat
                label="kg/nivel"
                value={profile.kgPorNivel.toFixed(3)}
                valueClass="text-[color:var(--color-neon-cyan)]"
              />
              <NeonStat
                label="XP/nivel"
                value={profile.xpPorNivel.toFixed(0)}
                valueClass="text-[color:var(--color-neon-cyan)]"
              />
              <NeonStat
                label="Niveles/sem"
                value={profile.nivelesPorSemana.toFixed(2)}
                valueClass="text-[color:var(--color-neon-purple)]"
              />
              <NeonStat
                label="Sem. a L80"
                value={profile.semanasA_L80.toFixed(0)}
                valueClass="text-[color:var(--color-neon-purple)]"
              />
            </div>
          </NeonCard>
        </>
      }
    >
      <VerifyEmailBanner />
      <TrialBanner />

      {/* Registro diario rápido — tabs arriba (lo más usado a diario) */}
      <DailyInputTabs
        pesoKg={header.pesoHoy ?? profile.pesoInicialKg}
        attributes={attributes}
        isPremium={isPremium}
      />

      {/* Estado de hoy: peso + rango esperado */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <WeightCard data={header} />
        <RangeCard data={header} />
      </div>

      {/* Progresión RPG: XP + próximo hito + camino L0→L80 */}
      <ExperienceCard data={xp} />
      <NextMilestoneCard data={xp} />
      <LevelPathCard data={xp} />

      {/* Radar de atributos (lectura, no input — el input vive en las tabs) */}
      <AttributesRadar data={attributes} />

      {/* Evolución de peso (Fase 9) — ancho completo, Premium */}
      {isPremium ? (
        <WeightChartCard />
      ) : (
        <PremiumLockedCard
          title="EVOLUCIÓN DEL PESO"
          description="Gráfica con banda del rango esperado, peso real, media móvil 7d y peso teórico."
        />
      )}

      {/* Semanas y colchón (Fase 10) — Premium */}
      {isPremium && weeksData ? (
        <WeeksCard data={weeksData} />
      ) : (
        <PremiumLockedCard
          title="SEMANAS Y COLCHÓN"
          description="Estado semanal lun-dom, colchón de XP acumulado y compensación de semanas en déficit."
        />
      )}

      {/* Camino al destino (Fase 11) — Premium */}
      {isPremium && pathData ? (
        <PathCard data={pathData} />
      ) : (
        <PremiumLockedCard
          title="CAMINO AL DESTINO"
          description="Recorrido L0→L80, llegada estimada y compra de niveles desde el colchón."
        />
      )}

      {/* Bitácora + Registro de atributos (Fase 12) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BitacoraCard />
        <RegistroAtributosCard />
      </div>

      {sinPesos && (
        <NeonCard tone="orange" title="BIENVENIDA" symbol="▶">
          <p className="text-xl">
            Aún no has registrado tu primer peso. Pulsa{' '}
            <span style={{ color: 'var(--color-neon-orange)' }}>
              [ Actualizar peso de hoy ]
            </span>{' '}
            arriba para empezar.
          </p>
        </NeonCard>
      )}
      <LevelUpOverlay event={levelUp} onDismiss={dismissLevelUp} />
    </AppShell>
  );
}
