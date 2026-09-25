import Link from 'next/link';

import { LayoutDashboard } from 'lucide-react';

import { APP_URLS } from '@/lib/constants';

export function FloatingAdminButton() {
  return (
    <Link
      href={APP_URLS.upcomingShootings}
      className="fixed right-5 bottom-5 z-20 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3.5 font-medium text-white shadow-xl transition hover:bg-black/45"
    >
      <LayoutDashboard size={18} />
      Admin
    </Link>
  );
}
