"use client";

import { LivePaymentsLedger } from "@/components/reports/live-reports";
import { BuyerLayout } from "./buyer-layout";

/** Payment records for the active buyer company, as confirmed by the backend. */
export function BuyerTransactionsPage() {
  return (
    <BuyerLayout>
      <div className="h-full overflow-y-auto bg-white">
        <LivePaymentsLedger />
      </div>
    </BuyerLayout>
  );
}
