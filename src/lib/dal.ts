import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { SessionKind } from '@/generated/prisma/client';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
import { APP_URLS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { CLIENT_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/session';
import { hashToken } from '@/lib/token';

// Returns session data or null — use on public pages.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken), kind: SessionKind.ADMIN },
    include: { owner: { include: { staffProfile: true } } },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.owner.staffProfile
  ) {
    return null;
  }

  return { user: session.owner, staffProfile: session.owner.staffProfile };
});

// Returns session data or redirects to login — use on protected pages.
export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
});

// Guards a specific /admin/<page> beyond "any staff member" — looks up its
// required roles from the same ADMIN_NAV_ITEMS list AppSidebar renders from.
// Fails closed: an href with no matching nav entry is a bug, not "allowed."
export async function requireNavAccess(href: string) {
  const session = await verifySession();

  const navItem = ADMIN_NAV_ITEMS.find((item) => item.href === href);
  if (!navItem) {
    throw new Error(`No ADMIN_NAV_ITEMS entry for "${href}"`);
  }

  if (!navItem.allowedRoles.includes(session.staffProfile.role)) {
    redirect(APP_URLS.upcomingShootings);
  }

  return session;
}

// The client-portal mirror of getSession(). Discriminated by
// `owner.clientProfile` the same way the admin one is by `owner.staffProfile`,
// so a user who happens to hold both profiles gets exactly what each cookie
// grants and nothing more.
export const getClientSession = cache(async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(CLIENT_SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken), kind: SessionKind.CLIENT },
    include: { owner: { include: { clientProfile: true } } },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.owner.clientProfile
  ) {
    return null;
  }

  return { user: session.owner, clientProfile: session.owner.clientProfile };
});

// Row-scoping, which the client portal needs and /admin doesn't: a valid
// client_session proves *a* client is logged in, not that they're *this*
// client. Without this check anyone with a portal session could swap the
// clientProfileId in the URL and read another client's payments.
//
// Fails with notFound() rather than a redirect: there is no client login page
// to send them to, and a 404 doesn't confirm that the other id exists.
export async function requireClientAccess(clientProfileId: string) {
  const session = await getClientSession();

  if (!session || session.clientProfile.id !== clientProfileId) {
    notFound();
  }

  return session;
}
