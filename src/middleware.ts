import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/tickets', '/account', '/purchases', '/settings', '/checkout'];
const DASHBOARD_PATHS = ['/dashboard'];
const STREAM_PATHS = ['/live', '/replay'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isDashboard = DASHBOARD_PATHS.some((p) => pathname.startsWith(p));
  const isStream = STREAM_PATHS.some((p) => pathname.startsWith(p));

  if ((isProtected || isDashboard || isStream) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/tickets/:path*',
    '/account/:path*',
    '/purchases/:path*',
    '/settings/:path*',
    '/dashboard/:path*',
    '/checkout/:path*',
    '/live/:path*',
    '/replay/:path*',
  ],
};
