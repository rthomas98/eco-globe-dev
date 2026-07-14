import { BlockchainTraceabilityCenter } from "@/components/phase-three/phase-three-centers";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Blockchain Traceability">
      <BlockchainTraceabilityCenter role="seller" />
    </SellerLayout>
  );
}
