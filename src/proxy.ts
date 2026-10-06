import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { REDIRECT_URL_PARAM, SESSION_COOKIE_NAME } from '@/lib/session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isLoginRoute =
      pathname === '/admin/login' || pathname.startsWith('/admin/login/');
    const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

    if (!isLoginRoute && !hasSessionCookie) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set(
        REDIRECT_URL_PARAM,
        pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
