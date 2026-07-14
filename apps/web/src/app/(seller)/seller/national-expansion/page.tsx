import { NationalExpansionCenter } from "@/components/phase-three/phase-three-centers";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="National Expansion">
      <NationalExpansionCenter role="seller" />
    </SellerLayout>
  );
}
