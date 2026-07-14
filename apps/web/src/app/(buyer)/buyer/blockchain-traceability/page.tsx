import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { BlockchainTraceabilityCenter } from "@/components/phase-three/phase-three-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <BlockchainTraceabilityCenter role="buyer" />
    </BuyerLayout>
  );
}
