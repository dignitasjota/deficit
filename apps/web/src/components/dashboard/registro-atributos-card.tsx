'use client';

import type {
  AtributoCodigo,
  AttributeLogEntryDto,
  AttributeLogPage,
} from '@perdida-peso/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { NeonCard } from '@/components/ui/neon-card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-provider';
import { toneVar, type NeonTone } from '@/lib/tones';

const ATRIBUTO_TONE: Record<AtributoCodigo, NeonTone> = {
  FUE: 'red',
  VIT: 'green',
  DES: 'yellow',
  INT: 'blue',
  CRE: 'cyan',
  ESP: 'purple',
  CAR: 'pink',
  HID: 'magenta',
  PRO: 'orange',
};

const ATRIBUTOS: AtributoCodigo[] = [
  'FUE',
  'VIT',
  'DES',
  'INT',
  'CRE',
  'ESP',
  'CAR',
  'HID',
  'PRO',
];

const PAGE_SIZE = 30;

type Filtro = AtributoCodigo | 'TODO';

export function RegistroAtributosCard() {
  const [filtro, setFiltro] = useState<Filtro>('TODO');

  const query = useInfiniteQuery<AttributeLogPage>({
    queryKey: queryKeys.attributesLog(filtro === 'TODO' ? null : filtro),
    queryFn: ({ pageParam }) =>
      api.getAttributesLog({
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
        limit: PAGE_SIZE,
        atributo: filtro === 'TODO' ? undefined : filtro,
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

  const entries: AttributeLogEntryDto[] =
    query.data?.pages.flatMap((p) => p.entries) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <NeonCard
      tone="purple"
      title="REGISTRO ATRIBUTOS"
      symbol="◈"
      cornerNote={
        <span
          className="font-[family-name:var(--font-vt323)] text-base"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          [{total}]
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1 font-[family-name:var(--font-vt323)] text-base">
        <FiltroChip
          activo={filtro === 'TODO'}
          onClick={() => setFiltro('TODO')}
          tone="muted"
          label="TODO"
        />
        {ATRIBUTOS.map((code) => (
          <FiltroChip
            key={code}
            activo={filtro === code}
            onClick={() => setFiltro(code)}
            tone={ATRIBUTO_TONE[code]}
            label={code}
          />
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-base" style={{ color: 'var(--color-fg-subtle)' }}>
          Cargando…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-base" style={{ color: 'var(--color-fg-subtle)' }}>
          {filtro === 'TODO'
            ? 'Sin registros todavía. Suma un +1 a un atributo desde la card de ATRIBUTOS.'
            : `Sin registros de ${filtro} todavía.`}
        </p>
      ) : (
        <div className="max-h-[24rem] overflow-y-auto pr-1">
          <ul className="flex flex-col gap-1">
            {entries.map((e) => (
              <RegistroRow key={e.id} entry={e} />
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

function FiltroChip({
  activo,
  onClick,
  tone,
  label,
}: {
  activo: boolean;
  onClick: () => void;
  tone: NeonTone;
  label: string;
}) {
  const color = toneVar(tone);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border px-2 py-0.5 uppercase tracking-wider transition-colors',
        activo ? 'opacity-100' : 'opacity-50 hover:opacity-90',
      )}
      style={{
        borderColor: color,
        color,
        backgroundColor: activo
          ? `color-mix(in srgb, ${color} 18%, transparent)`
          : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

function RegistroRow({ entry }: { entry: AttributeLogEntryDto }) {
  const tone = ATRIBUTO_TONE[entry.atributo];
  const color = toneVar(tone);
  return (
    <li
      className="grid grid-cols-[2.5rem_3.5rem_1fr_2.5rem] items-baseline gap-2 border-b py-1 text-base font-[family-name:var(--font-vt323)] sm:grid-cols-[3rem_5rem_1fr_3rem]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)' }}
    >
      <span className="uppercase tracking-wider" style={{ color }}>
        [{entry.atributo}]
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
        title={entry.descripcion ?? undefined}
      >
        {entry.descripcion ?? '—'}
      </span>
      <span className="text-right tabular-nums" style={{ color }}>
        +{entry.delta}
      </span>
    </li>
  );
}

function formatFecha(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
