import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { RecommendationsCenter } from "@/components/phase-two/phase-two-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <RecommendationsCenter role="buyer" />
    </BuyerLayout>
  );
}
