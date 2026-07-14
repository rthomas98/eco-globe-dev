import { SellerLayout } from "@/components/seller/seller-layout";
import { VerificationCenter } from "@/components/verification/verification-center";

export default function Page() {
  return (
    <SellerLayout title="Verification">
      <VerificationCenter role="seller" />
    </SellerLayout>
  );
}
