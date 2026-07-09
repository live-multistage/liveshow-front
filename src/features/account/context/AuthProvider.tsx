'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

interface AuthProviderProps {
  children: React.ReactNode;
  // Server-decoded from the access_token cookie (see
  // src/features/account/queries/get-auth-state.server.ts) — used only as
  // the pre-hydration snapshot below; once the real hydration effect
  // resolves, isLoggedIn is derived from `user` exactly as this hook always
  // computed it.
  initialIsLoggedIn: boolean;
  // Server-fetched via GET /auth/me (getUserServer) using the access_token
  // cookie as Bearer — null when logged out, or when SSR couldn't reach the
  // backend (rare; the hydration effect below still falls back to
  // localStorage in that case, exactly as it did before this prop existed).
  initialUser: AuthUser | null;
}

export function AuthProvider({ children, initialIsLoggedIn, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      if (tokenStore.get()) {
        if (!initialUser) {
          const stored = localStorage.getItem('user');
          if (stored) {
            try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchSession();
        if (data) {
          tokenStore.set(data.accessToken);
          if (!initialUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
              try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    void hydrate();
    // initialUser is a prop captured once at mount (Provider is mounted
    // exactly once, at the app root) — it can't meaningfully change across
    // this component's lifetime, so it's intentionally excluded from the
    // dependency array rather than re-running hydration if it did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    tokenStore.clear();
    localStorage.removeItem('user');
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    queryClient.clear();
    setUser(null);
    router.push('/login');
  }, [router, queryClient]);

  // While hydration is still in flight, trust the server-decoded snapshot
  // (correct immediately — no cookie round-trip needed) instead of a
  // hardcoded false. Once hydration resolves (isLoading becomes false),
  // isLoggedIn tracks `user` directly — exactly how this hook always
  // computed it (`isLoggedIn: !!user`) before this Provider existed.
  const isLoggedIn = isLoading ? initialIsLoggedIn : !!user;

  const value = useMemo(
    () => ({ user, isLoggedIn, isLoading, logout }),
    [user, isLoggedIn, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContextValue(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContextValue must be used within an AuthProvider');
  }
  return ctx;
}
