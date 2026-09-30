import { RefundCasesPage } from "@/components/refunds/refund-cases-page";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Refunds">
      <RefundCasesPage role="seller" />
    </SellerLayout>
  );
}
