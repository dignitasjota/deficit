import type { TokenPair } from '@perdida-peso/schemas';

const KEY = 'perdida-peso.tokens.v1';

export const authStorage = {
  read(): TokenPair | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TokenPair;
    } catch {
      return null;
    }
  },
  write(tokens: TokenPair | null): void {
    if (typeof window === 'undefined') return;
    if (tokens === null) {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, JSON.stringify(tokens));
    }
  },
};
