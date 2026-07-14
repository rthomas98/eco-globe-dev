import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { SmartContractAutomationCenter } from "@/components/phase-three/phase-three-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <SmartContractAutomationCenter role="buyer" />
    </BuyerLayout>
  );
}
