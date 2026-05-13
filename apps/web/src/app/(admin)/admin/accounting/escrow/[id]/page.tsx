import { AdminEscrowDetailPage } from "@/components/admin/escrow-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminEscrowDetailPage id={id} />;
}
