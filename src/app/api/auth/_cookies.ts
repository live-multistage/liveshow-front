import type { NextResponse } from 'next/server';

const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8080/api'
).replace(/\/$/, '');

export { API_URL };

const secure = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe?: boolean,
) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set('access_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/' });
}
