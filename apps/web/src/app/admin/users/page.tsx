'use client';

import type { AdminUserListItem, AdminUserListPage } from '@perdida-peso/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const { api } = useAuth();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useInfiniteQuery<AdminUserListPage>({
    queryKey: ['admin', 'users', debounced],
    queryFn: ({ pageParam }) =>
      api.listAdminUsers({
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
        limit: PAGE_SIZE,
        q: debounced || undefined,
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

  const users = query.data?.pages.flatMap((p) => p.users) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <NeonCard
      tone="cyan"
      title="USUARIOS"
      symbol="◆"
      cornerNote={
        <span
          className="font-[family-name:var(--font-vt323)] text-base"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          [{total}]
        </span>
      }
    >
      <div className="mb-3">
        <Input
          type="search"
          placeholder="buscar por email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {query.isLoading ? (
        <p style={{ color: 'var(--color-fg-subtle)' }}>Cargando…</p>
      ) : users.length === 0 ? (
        <p style={{ color: 'var(--color-fg-subtle)' }}>Sin resultados.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ul className="flex flex-col gap-1 font-[family-name:var(--font-vt323)] text-base">
            {users.map((u) => (
              <UserRow key={u.id} user={u} />
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

function UserRow({ user }: { user: AdminUserListItem }) {
  const status = computeStatus(user);
  return (
    <li
      className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-3 border-b py-1"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)',
      }}
    >
      <Link
        href={`/admin/users/${user.id}`}
        className="truncate underline"
        style={{ color: 'var(--color-neon-cyan)' }}
      >
        {user.email}
      </Link>
      <span
        className="text-sm uppercase tabular-nums"
        style={{ color: status.color }}
      >
        {status.label}
      </span>
      <span
        className="text-sm tabular-nums"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {user.role === 'admin' ? '◆ admin' : 'user'}
      </span>
      <span
        className="text-sm tabular-nums"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {user.lastSeenAt ? formatRel(user.lastSeenAt) : '—'}
      </span>
    </li>
  );
}

function computeStatus(u: AdminUserListItem): { label: string; color: string } {
  if (u.deletedAt) return { label: 'borrado', color: 'var(--color-neon-red)' };
  if (u.suspendedAt) return { label: 'suspendido', color: 'var(--color-neon-orange)' };
  if (!u.emailVerifiedAt) return { label: 'sin verificar', color: 'var(--color-neon-yellow)' };
  return { label: 'activo', color: 'var(--color-neon-green)' };
}

function formatRel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 30) return `${diffDays}d`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
  return `${Math.floor(diffDays / 365)}a`;
}
