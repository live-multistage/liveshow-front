'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

// Coalesces parallel session fetches from multiple component mounts on first
// page load. Without this, N concurrent useAuth() calls all fire /api/auth/session
// before any of them sets tokenStore.
let pendingSession: Promise<{ accessToken: string } | null> | null = null;

function fetchSession(): Promise<{ accessToken: string } | null> {
  if (!pendingSession) {
    pendingSession = fetch('/api/auth/session')
      .then((res) => (res.ok ? (res.json() as Promise<{ accessToken: string }>) : null))
      .catch(() => null)
      .finally(() => { pendingSession = null; });
  }
  return pendingSession;
}

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
        const data = await fetchSession();
        if (data) {
          tokenStore.set(data.accessToken);
          const stored = localStorage.getItem('user');
          if (stored) {
            try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
          }
        }
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
