import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { MobileAccessPreviewCenter } from "@/components/phase-three/phase-three-centers";

export default function Page() {
  return (
    <BuyerLayout>
      <MobileAccessPreviewCenter role="buyer" />
    </BuyerLayout>
  );
}
