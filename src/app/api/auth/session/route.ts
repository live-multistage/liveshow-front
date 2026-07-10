import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { isTokenExpired, getTokenRememberMe } from '@/lib/auth/jwt.server';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (!isTokenExpired(accessToken)) {
    return NextResponse.json({ accessToken, authenticated: true });
  }

  if (!refreshToken) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json() as { accessToken: string; refreshToken: string };
  const response = NextResponse.json({ accessToken: data.accessToken, authenticated: true });
  setAuthCookies(response, data.accessToken, data.refreshToken, getTokenRememberMe(data.refreshToken));
  return response;
}
