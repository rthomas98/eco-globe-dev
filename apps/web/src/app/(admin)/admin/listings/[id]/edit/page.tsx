import { AdminListingEditPage } from "@/components/admin/listing-edit-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminListingEditPage id={id} />;
}
