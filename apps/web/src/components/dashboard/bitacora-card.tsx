'use client';

import type { XpLogEntryDto, XpLogPage, XpTipo } from '@perdida-peso/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { NeonCard } from '@/components/ui/neon-card';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-provider';
import { toneVar, type NeonTone } from '@/lib/tones';

const TIPO_TONE: Record<XpTipo, NeonTone> = {
  P: 'green',
  C: 'orange',
  L: 'cyan',
  H: 'blue',
  A: 'purple',
  M: 'pink',
};

const TIPO_LABEL: Record<XpTipo, string> = {
  P: 'PASOS',
  C: 'KCAL',
  L: 'LIMPIEZA',
  H: 'HITO',
  A: 'ATRIBUTO',
  M: 'MANUAL',
};

const PAGE_SIZE = 30;

export function BitacoraCard() {
  const query = useInfiniteQuery<XpLogPage>({
    queryKey: queryKeys.xpLog,
    queryFn: ({ pageParam }) =>
      api.getXpLog({
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

  const entries: XpLogEntryDto[] = query.data?.pages.flatMap((p) => p.entries) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <NeonCard
      tone="green"
      title="BITÁCORA"
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
        <p className="text-base" style={{ color: 'var(--color-fg-subtle)' }}>
          Cargando…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-base" style={{ color: 'var(--color-fg-subtle)' }}>
          Sin entradas todavía. Cumple un hábito hoy y aparecerá aquí.
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto pr-1">
          <ul className="flex flex-col gap-1">
            {entries.map((e) => (
              <BitacoraRow key={e.id} entry={e} />
            ))}
          </ul>
          <div ref={sentinelRef} className="h-6" />
          {query.isFetchingNextPage && (
            <p
              className="py-2 text-center text-base"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              Cargando más…
            </p>
          )}
          {!query.hasNextPage && entries.length > PAGE_SIZE && (
            <p
              className="py-2 text-center text-sm"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              · fin del registro ·
            </p>
          )}
        </div>
      )}
    </NeonCard>
  );
}

function BitacoraRow({ entry }: { entry: XpLogEntryDto }) {
  const tone = TIPO_TONE[entry.tipo];
  const color = toneVar(tone);
  const positivo = entry.xp >= 0;

  return (
    <li
      className="grid grid-cols-[2.5rem_3.5rem_1fr_3.5rem] items-baseline gap-2 border-b py-1 text-base font-[family-name:var(--font-vt323)] sm:grid-cols-[3rem_5rem_1fr_4rem]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)' }}
    >
      <span
        className="uppercase tracking-wider tabular-nums"
        style={{ color }}
        title={TIPO_LABEL[entry.tipo]}
      >
        [{entry.tipo}]
      </span>
      <span
        className="tabular-nums"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {formatFecha(entry.fecha)}
      </span>
      <span
        className="truncate"
        style={{ color: 'var(--color-fg)' }}
        title={entry.descripcion}
      >
        {entry.descripcion}
      </span>
      <span
        className="text-right tabular-nums"
        style={{ color: positivo ? color : 'var(--color-neon-red)' }}
      >
        {positivo ? '+' : ''}
        {entry.xp.toLocaleString('es-ES')}
      </span>
    </li>
  );
}

function formatFecha(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
