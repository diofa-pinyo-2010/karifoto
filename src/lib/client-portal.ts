import { env } from '@/env';
import { APP_URLS } from '@/lib/constants';
import { CLIENT_PORTAL_TOKEN_PARAM } from '@/lib/session';

// The link behind the "Ügyfélportál" button in the booking confirmation email.
// It points straight at the gated details page; the page bounces the token
// through /api/client-portal/verify, which sets the cookie and strips the
// token back out of the URL.
export function clientPortalLoginUrl({
  clientProfileId,
  shootingId,
  rawToken,
}: {
  clientProfileId: string;
  shootingId: string;
  rawToken: string;
}) {
  const url = new URL(
    APP_URLS.clientPortalShootingDetails(clientProfileId, shootingId),
    env.NEXT_PUBLIC_SITE_URL,
  );

  url.searchParams.set(CLIENT_PORTAL_TOKEN_PARAM, rawToken);

  return url.toString();
}
