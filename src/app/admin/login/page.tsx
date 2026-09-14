import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/admin/login/login-form';
import { getSession } from '@/lib/dal';

export default async function AdminLoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/admin/bookings');
  }

  return <LoginForm />;
}
