import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { DeliveryTrackingCenter } from "@/components/phase-two/phase-two-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <DeliveryTrackingCenter role="buyer" />
    </BuyerLayout>
  );
}
