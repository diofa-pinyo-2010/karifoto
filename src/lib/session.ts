export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
