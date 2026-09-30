import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { RefundCasesPage } from "@/components/refunds/refund-cases-page";

export default function Page() {
  return (
    <BuyerLayout>
      <RefundCasesPage role="buyer" />
    </BuyerLayout>
  );
}
