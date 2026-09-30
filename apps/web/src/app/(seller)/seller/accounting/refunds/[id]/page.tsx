import { RefundCasePage } from "@/components/refunds/refund-cases-page";
import { SellerLayout } from "@/components/seller/seller-layout";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <SellerLayout title="Refunds">
      <RefundCasePage role="seller" id={id} />
    </SellerLayout>
  );
}
