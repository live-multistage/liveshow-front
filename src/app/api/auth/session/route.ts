import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { isTokenExpired, getTokenRememberMe } from '@/lib/auth/jwt.server';

// "No session" is the normal answer for an anonymous visitor, not an error —
// a 401 here logged a console error on every public page (Lighthouse
// errors-in-console). Callers read `authenticated` instead of the status.
function anonymous() {
  return NextResponse.json({ authenticated: false });
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!accessToken) return anonymous();

  if (!isTokenExpired(accessToken)) {
    return NextResponse.json({ accessToken, authenticated: true });
  }

  if (!refreshToken) {
    const response = anonymous();
    clearAuthCookies(response);
    return response;
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = anonymous();
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json() as { accessToken: string; refreshToken: string };
  const response = NextResponse.json({ accessToken: data.accessToken, authenticated: true });
  setAuthCookies(response, data.accessToken, data.refreshToken, getTokenRememberMe(data.refreshToken));
  return response;
}
