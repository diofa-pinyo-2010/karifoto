import { Settings, SpotlightIcon } from 'lucide-react';

import { StaffProfileRole } from '@/generated/prisma/enums';

import type { LucideIcon } from 'lucide-react';

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: readonly StaffProfileRole[];
};

export type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

const ALL_STAFF = [
  StaffProfileRole.SUPERADMIN,
  StaffProfileRole.EDITOR,
] as const;

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    label: 'Minden munkatárs',
    items: [
      {
        title: 'Következő fotózások',
        href: '/admin/bookings',
        icon: SpotlightIcon,
        allowedRoles: ALL_STAFF,
      },
    ],
  },
  {
    label: 'Csak admin',
    items: [
      {
        title: 'Beállítások',
        href: '/admin/settings',
        icon: Settings,
        allowedRoles: [StaffProfileRole.SUPERADMIN],
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] =
  ADMIN_NAV_GROUPS.flatMap((group) => group.items);
