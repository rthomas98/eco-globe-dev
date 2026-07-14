import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { PartnerNetworkCenter } from "@/components/phase-two/phase-two-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <PartnerNetworkCenter role="buyer" />
    </BuyerLayout>
  );
}
