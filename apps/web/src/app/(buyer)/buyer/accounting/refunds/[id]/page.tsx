import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { RefundCasePage } from "@/components/refunds/refund-cases-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <BuyerLayout>
      <RefundCasePage role="buyer" id={id} />
    </BuyerLayout>
  );
}
