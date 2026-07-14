import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { AnalyticsCenter } from "@/components/phase-two/phase-two-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <AnalyticsCenter role="buyer" />
    </BuyerLayout>
  );
}
