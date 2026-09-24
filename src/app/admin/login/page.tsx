import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/admin/login/login-form';
import { getSession } from '@/lib/dal';
import { REDIRECT_URL_PARAM, sanitizeAdminRedirect } from '@/lib/session';

export default async function AdminLoginPage(props: PageProps<'/admin/login'>) {
  const session = await getSession();

  if (session) {
    redirect('/admin/bookings');
  }

  const searchParams = await props.searchParams;
  const redirectUrl = sanitizeAdminRedirect(searchParams[REDIRECT_URL_PARAM]);

  return <LoginForm redirectUrl={redirectUrl} />;
}
