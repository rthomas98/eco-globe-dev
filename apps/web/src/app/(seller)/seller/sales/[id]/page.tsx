import { SellerSaleDetailPage } from "@/components/seller/sale-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerSaleDetailPage id={id} />;
}
