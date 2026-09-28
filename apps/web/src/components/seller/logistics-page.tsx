"use client";

import { SellerLayout } from "./seller-layout";
import { LogisticsWorkspace } from "@/components/logistics/logistics-workspace";
import { PilotShipmentsSection } from "@/components/logistics/pilot-shipments-section";

export function SellerLogisticsPage() {
  return (
    <SellerLayout title="Logistics & Shipping">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
          Fulfillment workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">
          Quote, attach the BOL and record dispatch.
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Record the shipping quote you arranged for each delivery order. Once the buyer accepts,
          attach the Bill of Lading and record dispatch when the carrier collects the load. The
          buyer records receipt on arrival. Pickup orders need no quote.
        </p>
      </div>

      <div className="mb-6">
        <PilotShipmentsSection portal="seller" />
      </div>

      <LogisticsWorkspace portal="seller" />
    </SellerLayout>
  );
}
