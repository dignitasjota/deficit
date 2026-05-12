'use client';

import { ApiError } from '@perdida-peso/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NeonCard, NeonStat } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

const IMPERSONATE_PREV_KEY = 'pp:impersonate-prev';

export default function AdminUserDetailPage() {
  const { api, refresh } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const detail = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => api.getAdminUser(id),
    enabled: Boolean(id),
  });

  const [actionError, setActionError] = useState<string | null>(null);

  const suspend = useMutation({
    mutationFn: () => api.suspendUser(id, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
    onError: (e) => setActionError(e instanceof ApiError ? readError(e) : 'Error inesperado'),
  });

  const restore = useMutation({
    mutationFn: () => api.restoreUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
    onError: (e) => setActionError(e instanceof ApiError ? readError(e) : 'Error inesperado'),
  });

  const impersonate = useMutation({
    mutationFn: async () => {
      const prevTokens = api.getTokens();
      const adminEmail = (await api.me()).email;
      // Persistimos antes de cambiar de identidad para poder volver.
      window.localStorage.setItem(
        IMPERSONATE_PREV_KEY,
        JSON.stringify({ tokens: prevTokens, adminEmail }),
      );
      return api.impersonateUser(id);
    },
    onSuccess: async () => {
      await refresh();
      router.push('/');
    },
    onError: (e) => {
      window.localStorage.removeItem(IMPERSONATE_PREV_KEY);
      setActionError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    },
  });

  if (detail.isLoading || !detail.data) {
    return (
      <p
        className="font-[family-name:var(--font-vt323)] text-xl terminal-cursor"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        ▶ cargando usuario
      </p>
    );
  }

  const u = detail.data;

  return (
    <div className="space-y-3">
      <NeonCard tone="cyan" title={u.email} symbol="◆">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 font-[family-name:var(--font-vt323)] text-base">
          <Stat label="ID" value={<code className="text-sm">{u.id}</code>} />
          <Stat label="Rol" value={u.role === 'admin' ? '◆ admin' : 'user'} />
          <Stat
            label="Email verificado"
            value={u.emailVerifiedAt ? '✓ ' + new Date(u.emailVerifiedAt).toLocaleDateString('es-ES') : '✗ no'}
            tone={u.emailVerifiedAt ? 'green' : 'orange'}
          />
          <Stat
            label="Suspendido"
            value={u.suspendedAt ? '⚠ ' + new Date(u.suspendedAt).toLocaleDateString('es-ES') : '—'}
            tone={u.suspendedAt ? 'orange' : undefined}
          />
          <Stat
            label="Borrado"
            value={u.deletedAt ? '✗ ' + new Date(u.deletedAt).toLocaleDateString('es-ES') : '—'}
            tone={u.deletedAt ? 'red' : undefined}
          />
          <Stat
            label="Purga programada"
            value={u.purgeScheduledAt ? new Date(u.purgeScheduledAt).toLocaleDateString('es-ES') : '—'}
            tone={u.purgeScheduledAt ? 'red' : undefined}
          />
          <Stat
            label="Última actividad"
            value={u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('es-ES') : '—'}
          />
          <Stat
            label="Creado"
            value={new Date(u.createdAt).toLocaleDateString('es-ES')}
          />
        </div>
      </NeonCard>

      <NeonCard tone="purple" title="PERFIL" symbol="◇">
        {u.hasProfile ? (
          <div className="space-y-1">
            <NeonStat label="Peso inicial" value={`${u.pesoInicialKg} kg`} tone="purple" />
            <NeonStat label="Peso objetivo" value={`${u.pesoObjetivoKg} kg`} tone="purple" />
          </div>
        ) : (
          <p style={{ color: 'var(--color-fg-subtle)' }}>Sin perfil (no completó onboarding).</p>
        )}
      </NeonCard>

      <NeonCard tone="orange" title="SESIONES" symbol="◊">
        <div className="space-y-1">
          <NeonStat label="Totales" value={u.totalSessions} tone="orange" />
          <NeonStat label="Activas" value={u.totalActiveSessions} tone="green" />
        </div>
      </NeonCard>

      <NeonCard tone="red" title="ACCIONES" symbol="⚠">
        <div className="flex flex-wrap gap-3">
          {u.suspendedAt ? (
            <Button
              tone="green"
              size="sm"
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
            >
              {restore.isPending ? '…' : '[ Restaurar ]'}
            </Button>
          ) : (
            <Button
              tone="orange"
              size="sm"
              onClick={() => suspend.mutate()}
              disabled={suspend.isPending || Boolean(u.deletedAt) || u.role === 'admin'}
            >
              {suspend.isPending ? '…' : '[ Suspender ]'}
            </Button>
          )}
          <Button
            tone="purple"
            size="sm"
            onClick={() => impersonate.mutate()}
            disabled={impersonate.isPending || Boolean(u.deletedAt) || u.role === 'admin'}
          >
            {impersonate.isPending ? '…' : '[ Impersonar ]'}
          </Button>
        </div>
        {u.role === 'admin' && (
          <p
            className="mt-2 text-sm font-[family-name:var(--font-vt323)]"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            ▸ Las acciones están deshabilitadas sobre otros admins.
          </p>
        )}
        {actionError && (
          <p
            className="mt-2 text-base font-[family-name:var(--font-vt323)]"
            style={{ color: 'var(--color-neon-red)' }}
          >
            ✗ {actionError}
          </p>
        )}
      </NeonCard>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'green' | 'orange' | 'red' | 'purple' | 'cyan';
}) {
  const colorMap = {
    green: 'var(--color-neon-green)',
    orange: 'var(--color-neon-orange)',
    red: 'var(--color-neon-red)',
    purple: 'var(--color-neon-purple)',
    cyan: 'var(--color-neon-cyan)',
  } as const;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1" style={{ borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)' }}>
      <span style={{ color: 'var(--color-fg-muted)' }} className="uppercase tracking-wide text-sm">
        {label}
      </span>
      <span
        className="text-right tabular-nums"
        style={{ color: tone ? colorMap[tone] : 'var(--color-fg)' }}
      >
        {value}
      </span>
    </div>
  );
}

function readError(e: ApiError): string {
  if (e.status === 403) return 'No autorizado';
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
