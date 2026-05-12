'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * QueryClient global con defaults razonables:
 * - staleTime 30s para evitar refetchs innecesarios al navegar entre cards.
 * - gcTime 5min, suficiente para sesiones largas.
 * - 1 retry: NO retry si la respuesta es 401/403/404 (lo gestiona el ApiClient
 *   con refresh automático ante 401).
 * - refetchOnWindowFocus: true para que volver a la pestaña refresque KPIs.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Crear el cliente lazily para que SSR y CSR no compartan instancia.
  const [client] = useState(() => makeClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Claves de query centralizadas. Mantenerlas aquí evita typos al invalidar
 * desde mutaciones que viven en componentes distintos.
 */
export const queryKeys = {
  me: ['me'] as const,
  profile: ['profile'] as const,
  dashboardHeader: ['dashboard', 'header'] as const,
  xpSummary: ['xp', 'summary'] as const,
  weights: (filter?: { from?: string; to?: string }) =>
    ['weights', filter?.from ?? 'all', filter?.to ?? 'all'] as const,
  entry: (fecha: string) => ['entries', fecha] as const,
  exercises: (fecha: string) => ['entries', fecha, 'exercise'] as const,
  attributes: ['attributes'] as const,
  weeks: ['weeks'] as const,
  pathDestination: ['path', 'destination'] as const,
  weightChart: (range: string) => ['charts', 'weight', range] as const,
  xpLog: ['xp', 'log'] as const,
  attributesLog: (filter?: string | null) =>
    ['attributes', 'log', filter ?? 'TODO'] as const,
};
