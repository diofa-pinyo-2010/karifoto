import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { env } from '@/env';

const BYPASS_COOKIE = 'coming-soon-bypass';

export function proxy(request: NextRequest) {
  if (!env.COMING_SOON_ENABLED || !env.COMING_SOON_PREVIEW_TOKEN) {
    return NextResponse.next();
  }

  const previewToken = request.nextUrl.searchParams.get('preview');
  if (previewToken === env.COMING_SOON_PREVIEW_TOKEN) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(BYPASS_COOKIE, env.COMING_SOON_PREVIEW_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  if (
    request.cookies.get(BYPASS_COOKIE)?.value === env.COMING_SOON_PREVIEW_TOKEN
  ) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL('/coming-soon', request.url));
}

export const config = {
  matcher: '/',
};
