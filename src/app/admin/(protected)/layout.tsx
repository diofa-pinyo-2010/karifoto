import { AppSidebar } from '@/components/admin/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toast';
import { verifySession } from '@/lib/dal';
import { logout } from '@/server/admin-auth';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const { user, staffProfile } = await verifySession();

  return (
    <SidebarProvider>
      <AppSidebar
        userName={user.name}
        userEmail={user.email}
        role={staffProfile.role}
        onLogout={logout}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
          <SidebarTrigger />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4 pb-8">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
