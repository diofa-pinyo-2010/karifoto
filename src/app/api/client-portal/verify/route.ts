import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SessionKind } from '@/generated/prisma/client';
import { createSession } from '@/lib/auth';
import { APP_URLS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import {
  CLIENT_PORTAL_NEXT_PARAM,
  CLIENT_PORTAL_TOKEN_PARAM,
  CLIENT_SESSION_COOKIE_NAME,
  sanitizeClientRedirect,
  sessionCookieOptions,
} from '@/lib/session';
import { hashToken } from '@/lib/token';

// Issues the client_session cookie from the token in the booking confirmation
// email. It exists because a Server Component can't set a cookie during render
// — the gated /details page detects `?token=`, bounces here, and we send the
// client back to a clean, token-free URL.
//
// This mirrors src/app/admin/login/verify/route.ts with ONE deliberate
// difference: it never claims the token. No `usedAt`, no atomic updateMany.
// The admin claim is what makes a magic link one-time; copying it here would
// lock a client out for good the first time they cleared their cookies, and
// there is no self-serve way for them back in.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get(CLIENT_PORTAL_TOKEN_PARAM);
  const invalidUrl = new URL(APP_URLS.clientPortalInvalidLink, request.url);

  if (!token) {
    return NextResponse.redirect(invalidUrl);
  }

  const portalToken = await prisma.clientPortalToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { owner: { include: { clientProfile: true } } },
  });

  if (
    !portalToken ||
    portalToken.expiresAt <= new Date() ||
    !portalToken.owner.clientProfile
  ) {
    return NextResponse.redirect(invalidUrl);
  }

  const { raw, expiresAt } = await createSession(
    portalToken.userId,
    SessionKind.CLIENT,
  );

  // Fall back to the client's own portal home rather than `/` — the token
  // proves who they are, so there's always somewhere sensible to land.
  const redirectUrl =
    sanitizeClientRedirect(
      request.nextUrl.searchParams.get(CLIENT_PORTAL_NEXT_PARAM),
    ) ?? APP_URLS.clientPortalHome(portalToken.owner.clientProfile.id);

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  response.cookies.set(
    CLIENT_SESSION_COOKIE_NAME,
    raw,
    sessionCookieOptions(expiresAt),
  );

  return response;
}
