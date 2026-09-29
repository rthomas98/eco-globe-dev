"use client";

import { LiveEscrowReport } from "@/components/reports/live-reports";
import { BuyerLayout } from "./buyer-layout";

/** Escrow records on the active buyer company's orders (scoped by the backend). */
export function BuyerEscrowPage() {
  return (
    <BuyerLayout>
      <div className="h-full overflow-y-auto bg-white">
        <LiveEscrowReport />
      </div>
    </BuyerLayout>
  );
}
