import { redirect } from 'next/navigation';

import { APP_URLS } from '@/lib/constants';

export default function AdminPage() {
  redirect(APP_URLS.upcomingShootings);
}
