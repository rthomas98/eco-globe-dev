import { PartnerNetworkCenter } from "@/components/phase-two/phase-two-centers";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Partner Network">
      <PartnerNetworkCenter role="seller" />
    </SellerLayout>
  );
}
