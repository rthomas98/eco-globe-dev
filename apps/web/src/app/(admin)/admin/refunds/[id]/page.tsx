import { RefundCasePage } from "@/components/refunds/refund-cases-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RefundCasePage role="admin" id={id} />;
}
