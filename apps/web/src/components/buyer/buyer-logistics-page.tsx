"use client";

import { BuyerLayout } from "./buyer-layout";
import { LogisticsWorkspace } from "@/components/logistics/logistics-workspace";
import { PilotShipmentsSection } from "@/components/logistics/pilot-shipments-section";

export function BuyerLogisticsPage() {
  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            Logistics & Shipping
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            Review shipping quotes and record receipt.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Sellers and EcoGlobe staff record shipping quotes for your delivery orders. Accepting a
            quote approves staff to coordinate the carrier. When the material arrives, or when you
            collect a pickup order, record who received it. Payment settlement is handled separately.
          </p>
        </div>

        <div className="mb-6">
          <PilotShipmentsSection portal="buyer" />
        </div>

        <LogisticsWorkspace portal="buyer" />
      </div>
    </BuyerLayout>
  );
}
