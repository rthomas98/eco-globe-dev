import { SellerListingDetailPage } from "@/components/seller/listing-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerListingDetailPage id={id} />;
}
