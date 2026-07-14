import { PaymentsCenter } from "@/components/payments/payments-center";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Payments">
      <PaymentsCenter role="seller" />
    </SellerLayout>
  );
}
