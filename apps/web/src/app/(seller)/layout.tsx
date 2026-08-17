import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalAuthGuard requiredRole="seller">{children}</PortalAuthGuard>;
}
