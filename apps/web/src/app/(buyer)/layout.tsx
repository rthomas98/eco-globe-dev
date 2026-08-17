import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalAuthGuard requiredRole="buyer">{children}</PortalAuthGuard>;
}
