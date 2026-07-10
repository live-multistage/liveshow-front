import { cookies } from 'next/headers';
import { isTokenExpired } from '@/lib/auth/jwt.server';
import type { AuthUser } from '../types/account.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// Pure JWT payload decode, no network call — mirrors the same expiry check
// /api/auth/session's route handler uses, minus the refresh-token exchange
// (that still only ever happens client-side, via useAuth's existing
// hydration effect, completely unchanged by this function). A freshly-
// expired access token with a still-valid refresh token reads as "logged
// out" here for one brief window until client hydration silently refreshes
// it — an accepted tradeoff, not a regression from today's behavior.
export async function getInitialIsLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return false;
  return !isTokenExpired(token);
}

// GET /auth/me — the same endpoint the client's getMe() (queries/get-me.ts)
// already calls, just server-side with the token forwarded as a Bearer
// header instead of relying on httpClient's browser-only auth interceptor.
// Returns null on any failure (backend down, token rejected) — the client
// hydration effect's existing localStorage fallback covers that case, same
// as it always has for a user it doesn't have SSR data for.
export async function getUserServer(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

// POST /auth/check — mirrors useAuthCheck's (hooks/use-auth-check.ts)
// request body shape exactly, so the dehydrated query cache entry this
// seeds matches what the client hook would otherwise fetch itself. Fails
// closed (allowed: false) on any error — a permission check must never
// silently default to "allowed" just because the SSR call failed.
export async function checkAuthServer(
  action: string,
  context: Record<string, unknown>,
  accessToken: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const res = await fetch(`${apiBase()}/auth/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, context }),
      cache: 'no-store',
    });
    if (!res.ok) return { allowed: false };
    return (await res.json()) as { allowed: boolean; reason?: string };
  } catch {
    return { allowed: false };
  }
}
