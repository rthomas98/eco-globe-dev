import { SellerLayout } from "@/components/seller/seller-layout";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";

export default function Page() {
  return (
    <SellerLayout title="Video demos">
      <VideoDemoCenter role="seller" />
    </SellerLayout>
  );
}
