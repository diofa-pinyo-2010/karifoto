import Link from 'next/link';

import { LayoutDashboard } from 'lucide-react';

export function FloatingAdminButton() {
  return (
    <Link
      href="/admin/bookings"
      className="fixed right-5 bottom-5 z-20 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-3.5 font-medium text-[#FFF4E6] shadow-xl transition hover:bg-terracotta-hover"
    >
      <LayoutDashboard size={18} />
      Admin
    </Link>
  );
}
