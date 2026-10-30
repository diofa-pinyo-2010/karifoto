import { redirect } from 'next/navigation';

import { VerifyForm } from '@/app/admin/login/verify/verify-form';
import { APP_URLS } from '@/lib/constants';
import { getSession } from '@/lib/dal';
import { REDIRECT_URL_PARAM, sanitizeAdminRedirect } from '@/lib/session';

export default async function AdminLoginVerifyPage(
  props: PageProps<'/admin/login/verify'>,
) {
  const session = await getSession();

  if (session) {
    redirect(APP_URLS.upcomingShootings);
  }

  const searchParams = await props.searchParams;
  const redirectUrl = sanitizeAdminRedirect(searchParams[REDIRECT_URL_PARAM]);

  return <VerifyForm redirectUrl={redirectUrl} />;
}
