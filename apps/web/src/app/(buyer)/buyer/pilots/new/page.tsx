import { Suspense } from "react";
import { BuyerPilotRequestPage } from "@/components/buyer/buyer-pilot-request-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BuyerPilotRequestPage />
    </Suspense>
  );
}
