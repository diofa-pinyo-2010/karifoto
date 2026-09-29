import Link from 'next/link';

import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { APP_URLS } from '@/lib/constants';

export function FloatingAdminButton() {
  return (
    <Button
      size="lg"
      render={
        <Link
          href={APP_URLS.upcomingShootings}
          className="fixed right-5 bottom-5 z-20 inline-flex items-center gap-2 rounded-full"
        >
          <LayoutDashboard size={18} />
          ADMIN
        </Link>
      }
    />
  );
}
