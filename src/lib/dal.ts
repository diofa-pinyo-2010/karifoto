import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
import { APP_URLS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { hashToken } from '@/lib/token';

// Returns session data or null — use on public pages.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
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
