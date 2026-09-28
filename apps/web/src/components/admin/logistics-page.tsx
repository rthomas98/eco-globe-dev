"use client";

import { LogisticsWorkspace } from "../logistics/logistics-workspace";
import { PilotShipmentsSection } from "../logistics/pilot-shipments-section";

export function AdminLogisticsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50">
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            Logistics oversight
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            Staff-managed quotes, BOLs and dispatch across all orders.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Record quotes, attach Bills of Lading and record dispatch on behalf of sellers. Quote
            acceptance and receipt stay with the buyer company. The carrier list is informational;
            no carrier is booked or tracked from here.
          </p>
        </div>
        <div className="mb-6">
          <PilotShipmentsSection />
        </div>

        <LogisticsWorkspace portal="admin" />
      </div>
    </div>
  );
}
