import { AdminSellerDetailPage } from "@/components/admin/seller-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminSellerDetailPage id={id} />;
}
