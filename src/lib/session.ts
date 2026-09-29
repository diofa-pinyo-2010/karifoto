export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes
export const REDIRECT_URL_PARAM = 'redirectUrl';

// Clients get their own cookie because they're a different relation
// (owner.clientProfile, not owner.staffProfile) and need a far longer session
// than staff — they only ever get here from a link in an email they may open
// months after booking.
export const CLIENT_SESSION_COOKIE_NAME = 'client_session';
export const CLIENT_SESSION_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year
export const CLIENT_PORTAL_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year
export const CLIENT_PORTAL_TOKEN_PARAM = 'token';
export const CLIENT_PORTAL_NEXT_PARAM = 'next';

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

// Only ever follow this into another /admin page — never off-site, and never
// back into the login flow itself (that would loop after a successful login).
export function sanitizeAdminRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/admin')) {
    return null;
  }

  const isLoginRoute =
    value === '/admin/login' || value.startsWith('/admin/login/');

  return isLoginRoute ? null : value;
}

// Same idea for the client portal: the verify route only ever hands control
// back to a /client page. `//evil.com` would be read as a protocol-relative URL
// by NextResponse.redirect, so it's rejected explicitly.
export function sanitizeClientRedirect(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/client/') ||
    value.startsWith('//')
  ) {
    return null;
  }

  return value;
}
