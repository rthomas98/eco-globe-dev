import { AdminLayout } from "@/components/admin/admin-layout";
import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard requiredRole="admin">
      <AdminLayout showLogistics showContracts>
        {children}
      </AdminLayout>
    </PortalAuthGuard>
  );
}
