import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { getTokenRememberMe } from '@/lib/auth/jwt.server';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json();
  const response = NextResponse.json({ accessToken: data.accessToken });
  setAuthCookies(response, data.accessToken, data.refreshToken, getTokenRememberMe(data.refreshToken));
  return response;
}
