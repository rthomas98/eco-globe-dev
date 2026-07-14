import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { DocumentsCenter } from "@/components/documents/documents-center";

export default function Page() {
  return (
    <BuyerLayout>
      <DocumentsCenter role="buyer" />
    </BuyerLayout>
  );
}
