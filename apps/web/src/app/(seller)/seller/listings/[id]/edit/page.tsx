import { SellerListingEditPage } from "@/components/seller/listing-edit-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerListingEditPage id={id} />;
}
