import { LiveSignatureWorkspace } from "../signatures/live-signature-workspace";
import { SellerLayout } from "./seller-layout";

export function SellerESignaturesPage() {
  return (
    <SellerLayout title="E-signatures">
      <LiveSignatureWorkspace role="seller" />
    </SellerLayout>
  );
}
