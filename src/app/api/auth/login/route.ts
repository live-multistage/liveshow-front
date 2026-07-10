import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setAuthCookies } from '../_cookies';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const response = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  setAuthCookies(response, data.accessToken, data.refreshToken, body.rememberMe);
  return response;
}
