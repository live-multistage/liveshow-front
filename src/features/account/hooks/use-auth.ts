'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function hydrate() {
      if (tokenStore.get()) {
        const stored = localStorage.getItem('user');
        if (stored) {
          try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
        }
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json() as { accessToken: string };
          tokenStore.set(data.accessToken);
          const stored = localStorage.getItem('user');
          if (stored) {
            try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
          }
        }
      } catch {
        // no session — stay unauthenticated
      } finally {
        setIsLoading(false);
      }
    }

    void hydrate();
  }, []);

  const logout = useCallback(async () => {
    tokenStore.clear();
    localStorage.removeItem('user');
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, isLoggedIn: !!user, isLoading, logout };
}
