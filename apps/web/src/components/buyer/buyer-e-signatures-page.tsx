import { LiveSignatureWorkspace } from "../signatures/live-signature-workspace";
import { BuyerLayout } from "./buyer-layout";

export function BuyerESignaturesPage() {
  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <LiveSignatureWorkspace role="buyer" />
      </div>
    </BuyerLayout>
  );
}
