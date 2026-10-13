import { MarketRecordDetailPage } from "@/components/admin/market-records/market-record-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketRecordDetailPage id={id} />;
}
