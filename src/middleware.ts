import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/tickets', '/account', '/purchases', '/settings', '/checkout'];
const DASHBOARD_PATHS = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isDashboard = DASHBOARD_PATHS.some((p) => pathname.startsWith(p));

  if ((isProtected || isDashboard) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tickets/:path*', '/account/:path*', '/purchases/:path*', '/settings/:path*', '/dashboard/:path*', '/checkout/:path*'],
};
