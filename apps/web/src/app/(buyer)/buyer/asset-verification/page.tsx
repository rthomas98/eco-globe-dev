import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { AssetVerificationCenter } from "@/components/phase-two/phase-two-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <AssetVerificationCenter role="buyer" />
    </BuyerLayout>
  );
}
