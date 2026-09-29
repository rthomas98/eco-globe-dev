"use client";

import { LiveEscrowReport } from "@/components/reports/live-reports";
import { SellerLayout } from "./seller-layout";

/** Escrow records on the active seller company's orders (scoped by the backend). */
export function EscrowPage() {
  return (
    <SellerLayout title="Escrow">
      <LiveEscrowReport />
    </SellerLayout>
  );
}
