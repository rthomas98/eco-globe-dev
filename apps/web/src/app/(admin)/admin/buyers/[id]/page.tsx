import { AdminBuyerDetailPage } from "@/components/admin/buyer-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminBuyerDetailPage id={id} />;
}
