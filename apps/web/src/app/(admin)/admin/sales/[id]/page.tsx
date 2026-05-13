import { AdminSaleDetailPage } from "@/components/admin/sale-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSaleDetailPage id={id} />;
}
