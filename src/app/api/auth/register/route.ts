import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '../_cookies';

// Registration never returns a session anymore — `201 { verificationRequired:
// true }` for both a new and an already-registered email — so there are no
// cookies to set here. Kept as a thin proxy (rather than calling the API
// straight from the client) only for symmetry with login/refresh.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const acceptLanguage = req.headers.get('accept-language');
  const upstream = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(acceptLanguage ? { 'Accept-Language': acceptLanguage } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
