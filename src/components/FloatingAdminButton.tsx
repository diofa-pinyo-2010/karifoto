import Link from 'next/link';

import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { APP_URLS } from '@/lib/constants';

export function FloatingAdminButton() {
  // Canonical Base UI pattern:
  // bare element in render, styles + children on the component.
  return (
    <Button
      size="lg"
      nativeButton={false}
      className="fixed right-5 bottom-5 z-20 gap-2 rounded-lg"
      render={<Link href={APP_URLS.upcomingShootings} />}
    >
      <LayoutDashboard size={18} />
      ADMIN
    </Button>
  );
}
