import { cookies } from 'next/headers';
import { isTokenExpired } from '@/lib/auth/jwt.server';

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
