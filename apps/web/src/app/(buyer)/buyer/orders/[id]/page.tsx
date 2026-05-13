import { BuyerOrderDetailPage } from "@/components/buyer/buyer-order-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuyerOrderDetailPage id={id} />;
}
