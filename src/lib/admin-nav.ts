import {
  SpotlightIcon,
  BetweenHorizonalStartIcon,
  SettingsIcon,
  PhoneIcon,
} from 'lucide-react';

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
  StaffProfileRole.MEMBER,
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
        title: 'Idősávok',
        href: '/admin/time-slots',
        icon: BetweenHorizonalStartIcon,
        allowedRoles: [StaffProfileRole.SUPERADMIN],
      },
      {
        title: 'Telefonos foglalás',
        href: '/admin/remote-booking',
        icon: PhoneIcon,
        allowedRoles: [StaffProfileRole.SUPERADMIN],
      },
      {
        title: 'Beállítások',
        href: '/admin/settings',
        icon: SettingsIcon,
        allowedRoles: [StaffProfileRole.SUPERADMIN],
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] =
  ADMIN_NAV_GROUPS.flatMap((group) => group.items);
