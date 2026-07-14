import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { LanguageReadinessCenter } from "@/components/phase-three/phase-three-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <LanguageReadinessCenter role="buyer" />
    </BuyerLayout>
  );
}
