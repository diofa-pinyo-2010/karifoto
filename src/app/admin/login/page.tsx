import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/admin/login/login-form';
import { APP_URLS } from '@/lib/constants';
import { getSession } from '@/lib/dal';
import { REDIRECT_URL_PARAM, sanitizeAdminRedirect } from '@/lib/session';

export default async function AdminLoginPage(props: PageProps<'/admin/login'>) {
  const session = await getSession();

  if (session) {
    redirect(APP_URLS.upcomingShootings);
  }

  const searchParams = await props.searchParams;
  const redirectUrl = sanitizeAdminRedirect(searchParams[REDIRECT_URL_PARAM]);

  return <LoginForm redirectUrl={redirectUrl} />;
}
