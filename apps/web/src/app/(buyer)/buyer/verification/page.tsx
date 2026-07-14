import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { VerificationCenter } from "@/components/verification/verification-center";

export default function Page() {
  return (
    <BuyerLayout>
      <VerificationCenter role="buyer" />
    </BuyerLayout>
  );
}
