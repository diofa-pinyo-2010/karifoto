export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes
export const REDIRECT_URL_PARAM = 'redirectUrl';

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
