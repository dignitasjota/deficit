'use client';

import type { AdminAuditEntry, AdminAuditPage } from '@perdida-peso/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<AdminAuditEntry['action'], { label: string; color: string }> = {
  suspend_user: { label: 'SUSPEND', color: 'var(--color-neon-orange)' },
  restore_user: { label: 'RESTORE', color: 'var(--color-neon-green)' },
  impersonate_user: { label: 'IMPERSONATE', color: 'var(--color-neon-purple)' },
  promote_user: { label: 'PROMOTE', color: 'var(--color-neon-cyan)' },
  demote_user: { label: 'DEMOTE', color: 'var(--color-neon-yellow)' },
};

export default function AdminAuditPage() {
  const { api } = useAuth();
  const query = useInfiniteQuery<AdminAuditPage>({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }) =>
      api.listAdminAudit({
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
        limit: PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [first] = entries;
        if (first?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: '160px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [query]);

  const entries = query.data?.pages.flatMap((p) => p.entries) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <NeonCard
      tone="pink"
      title="AUDIT LOG"
      symbol="▦"
      cornerNote={
        <span
          className="font-[family-name:var(--font-vt323)] text-base"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          [{total}]
        </span>
      }
    >
      {query.isLoading ? (
        <p style={{ color: 'var(--color-fg-subtle)' }}>Cargando…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--color-fg-subtle)' }}>Sin entradas todavía.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ul className="flex flex-col gap-1 font-[family-name:var(--font-vt323)] text-base">
            {entries.map((e) => (
              <AuditRow key={e.id} entry={e} />
            ))}
          </ul>
          <div ref={sentinelRef} className="h-6" />
          {query.isFetchingNextPage && (
            <p
              className="py-2 text-center"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              Cargando más…
            </p>
          )}
        </div>
      )}
    </NeonCard>
  );
}

function AuditRow({ entry }: { entry: AdminAuditEntry }) {
  const meta = ACTION_LABEL[entry.action];
  return (
    <li
      className="grid grid-cols-[5rem_8rem_1fr_1fr] items-baseline gap-3 border-b py-1"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)' }}
    >
      <span style={{ color: meta.color }}>[{meta.label}]</span>
      <span style={{ color: 'var(--color-fg-muted)' }} className="tabular-nums">
        {new Date(entry.createdAt).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
      <span className="truncate" style={{ color: 'var(--color-neon-cyan)' }} title={entry.adminEmail ?? ''}>
        {entry.adminEmail ?? '—'}
      </span>
      <span className="truncate" style={{ color: 'var(--color-fg)' }} title={entry.targetEmail ?? ''}>
        {entry.targetEmail ?? <span style={{ color: 'var(--color-fg-subtle)' }}>—</span>}
      </span>
    </li>
  );
}
