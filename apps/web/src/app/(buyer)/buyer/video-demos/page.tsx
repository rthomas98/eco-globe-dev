import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";

export default function Page() {
  return (
    <BuyerLayout>
      <VideoDemoCenter role="buyer" />
    </BuyerLayout>
  );
}
