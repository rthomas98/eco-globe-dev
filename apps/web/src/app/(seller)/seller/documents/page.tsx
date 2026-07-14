import { DocumentsCenter } from "@/components/documents/documents-center";
import { SellerLayout } from "@/components/seller/seller-layout";

export default function Page() {
  return (
    <SellerLayout title="Documents">
      <DocumentsCenter role="seller" />
    </SellerLayout>
  );
}
