import { AdminTransactionDetailPage } from "@/components/admin/transaction-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTransactionDetailPage id={id} />;
}
