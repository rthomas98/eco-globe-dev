import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminAuthGuard } from "../../components/admin-auth-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminLayout showLogistics showContracts>
        {children}
      </AdminLayout>
    </AdminAuthGuard>
  );
}
