import type { NextResponse } from 'next/server';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api';

export { API_URL };

const secure = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set('access_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/' });
}
