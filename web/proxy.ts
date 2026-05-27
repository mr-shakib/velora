import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/invite'];
const ONBOARDING_PATHS = ['/setup-profile', '/invite-partner'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has('refresh_token');

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = ONBOARDING_PATHS.some((p) => pathname.startsWith(p));

  if (!hasRefreshCookie && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasRefreshCookie && isPublic && !isOnboarding) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico).*)'],
};
