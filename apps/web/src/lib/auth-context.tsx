'use client';

import { ApiClient, createApiClient } from '@perdida-peso/api-client';
import type { Me, TokenPair } from '@perdida-peso/schemas';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStorage } from './auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface AuthContextValue {
  api: ApiClient;
  me: Me | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        initialTokens: authStorage.read(),
        onTokensChange: (tokens: TokenPair | null) => authStorage.write(tokens),
      }),
    [],
  );

  const refresh = useCallback(async () => {
    if (!api.getTokens()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setMe(null);
      router.push('/login');
    }
  }, [api, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: AuthContextValue = {
    api,
    me,
    loading,
    isAuthenticated: me !== null,
    refresh,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
