'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Home } from 'lucide-react';

import { AdminUser } from '@/components/admin/admin-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ADMIN_NAV_GROUPS } from '@/lib/admin-nav';

import type { StaffProfileRole } from '@/generated/prisma/enums';

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  role: StaffProfileRole;
  onLogout: () => void;
};

export function AppSidebar({
  userName,
  userEmail,
  role,
  onLogout,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.allowedRoles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Karifoto landing"
              render={
                <Link
                  href="/"
                  onClick={() => isMobile && setOpenMobile(false)}
                />
              }
            >
              <Home />
              <span className="font-semibold">Karifoto landing</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      render={
                        <Link
                          href={item.href}
                          onClick={() => isMobile && setOpenMobile(false)}
                        />
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <AdminUser
          name={userName}
          email={userEmail}
          role={role}
          onLogout={onLogout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
