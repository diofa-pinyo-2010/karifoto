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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';

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
  const visibleItems = ADMIN_NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(role),
  );

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
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
