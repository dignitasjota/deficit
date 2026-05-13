'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export function RedirectIfAuth() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/app');
  }, [loading, isAuthenticated, router]);
  return null;
}
