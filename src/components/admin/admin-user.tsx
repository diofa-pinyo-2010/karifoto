'use client';

import Link from 'next/link';

import { ChevronsUpDown, LogOut, SquareCheckBigIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { StaffProfileRole } from '@/generated/prisma/enums';
import { APP_URLS } from '@/lib/constants';

const ROLE_LABELS: Record<StaffProfileRole, string> = {
  [StaffProfileRole.SUPERADMIN]: 'Admin',
  [StaffProfileRole.MEMBER]: 'Member',
};

type AdminUserProps = {
  name: string;
  email: string;
  role: StaffProfileRole;
  onLogout: () => void;
};

export function AdminUser({ name, email, role, onLogout }: AdminUserProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const initial = name.charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="rounded-md">
              <AvatarFallback className="rounded-md">{initial}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-start gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="shrink-0 rounded-md">
                    <AvatarFallback className="rounded-md">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <Badge variant="default" className="mb-2 w-fit rounded-sm">
                      {ROLE_LABELS[role]}
                    </Badge>
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link
                    href={APP_URLS.ownShootings}
                    onClick={() => isMobile && setOpenMobile(false)}
                  />
                }
              >
                <SquareCheckBigIcon />
                Feladatok
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onLogout()}>
                <LogOut />
                Kijelentkezés
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
