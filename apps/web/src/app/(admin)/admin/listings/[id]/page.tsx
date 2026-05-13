import { AdminListingDetailPage } from "@/components/admin/listing-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminListingDetailPage id={id} />;
}
