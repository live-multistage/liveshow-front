import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setAuthCookies } from '../../_cookies';
import { safeRedirect } from '@/lib/auth/safe-redirect';
import type { AuthResponse } from '@/features/account/types/account.types';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  const destination = safeRedirect(state);

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }

  const upstream = await fetch(`${API_URL}/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!upstream.ok) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }

  const data = await upstream.json() as AuthResponse;
  const response = NextResponse.redirect(new URL(destination, req.url));
  setAuthCookies(response, data.accessToken, data.refreshToken, true);
  return response;
}
