import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { PaymentsCenter } from "@/components/payments/payments-center";

export default function Page() {
  return (
    <BuyerLayout>
      <PaymentsCenter role="buyer" />
    </BuyerLayout>
  );
}
