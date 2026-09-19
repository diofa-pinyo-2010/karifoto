import { Settings, SpotlightIcon } from 'lucide-react';

import { StaffProfileRole } from '@/generated/prisma/enums';

import type { LucideIcon } from 'lucide-react';

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: readonly StaffProfileRole[];
};

const ALL_STAFF = [
  StaffProfileRole.SUPERADMIN,
  StaffProfileRole.EDITOR,
] as const;

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    title: 'Következő fotózások',
    href: '/admin/bookings',
    icon: SpotlightIcon,
    allowedRoles: ALL_STAFF,
  },
  {
    title: 'Beállítások',
    href: '/admin/settings',
    icon: Settings,
    allowedRoles: [StaffProfileRole.SUPERADMIN],
  },
];
