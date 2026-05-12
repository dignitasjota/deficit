'use client';

import { useQuery } from '@tanstack/react-query';
import { NeonCard, NeonStat } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

export default function AdminDashboardPage() {
  const { api } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.getAdminMetrics(),
  });

  if (isLoading || !data) {
    return (
      <p
        className="font-[family-name:var(--font-vt323)] text-xl terminal-cursor"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        ▶ cargando métricas
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <NeonCard tone="cyan" title="USUARIOS" symbol="◆">
        <div className="space-y-1">
          <NeonStat label="Total" value={data.totalUsers} tone="cyan" />
          <NeonStat label="Activos" value={data.activeUsers} tone="green" />
          <NeonStat label="Verificados" value={data.verifiedUsers} tone="green" />
          <NeonStat label="Suspendidos" value={data.suspendedUsers} tone="orange" />
          <NeonStat label="En gracia (borrados)" value={data.pendingDeletionUsers} tone="red" />
        </div>
      </NeonCard>

      <NeonCard tone="purple" title="ADQUISICIÓN" symbol="↑">
        <div className="space-y-1">
          <NeonStat label="Nuevos 7d" value={data.newUsersLast7d} tone="purple" />
          <NeonStat label="Nuevos 30d" value={data.newUsersLast30d} tone="purple" />
          <NeonStat label="Activos 7d" value={data.activeLast7d} tone="cyan" />
          <NeonStat label="Activos 30d" value={data.activeLast30d} tone="cyan" />
        </div>
      </NeonCard>

      <NeonCard tone="orange" title="MRR" symbol="€">
        <p
          className="font-[family-name:var(--font-vt323)] text-3xl tabular-nums"
          style={{ color: 'var(--color-neon-orange)' }}
        >
          {(data.mrrCents / 100).toLocaleString('es-ES', {
            style: 'currency',
            currency: 'EUR',
          })}
          <span
            className="ml-2 text-sm"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            /mes
          </span>
        </p>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          Placeholder hasta integrar Stripe (Fase 17).
        </p>
      </NeonCard>
    </div>
  );
}
