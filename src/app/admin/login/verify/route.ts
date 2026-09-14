import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { hashToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const invalidUrl = new URL('/admin/login?error=invalid', request.url);

  if (!token) {
    return NextResponse.redirect(invalidUrl);
  }

  const tokenHash = hashToken(token);

  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (
    !magicLinkToken ||
    magicLinkToken.usedAt ||
    magicLinkToken.expiresAt <= new Date()
  ) {
    return NextResponse.redirect(invalidUrl);
  }

  // Atomic claim — prevents a replayed link from creating two sessions.
  const { count } = await prisma.magicLinkToken.updateMany({
    where: { id: magicLinkToken.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count !== 1) {
    return NextResponse.redirect(invalidUrl);
  }

  const { raw, expiresAt } = await createSession(magicLinkToken.userId);

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    raw,
    sessionCookieOptions(expiresAt),
  );

  return response;
}
