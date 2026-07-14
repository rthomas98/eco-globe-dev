import { DeliveryTrackingCenter } from "@/components/phase-two/phase-two-centers";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Delivery Tracking">
      <DeliveryTrackingCenter role="seller" />
    </SellerLayout>
  );
}
