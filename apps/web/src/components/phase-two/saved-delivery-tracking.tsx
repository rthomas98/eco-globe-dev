"use client";

import { LogisticsWorkspace } from "@/components/logistics/logistics-workspace";
import { PilotShipmentsSection } from "@/components/logistics/pilot-shipments-section";
import type { LogisticsPortal } from "@/components/logistics/logistics-stage";

/**
 * Saved shipment tracking. Order shipments come from the persisted logistics
 * workspace (the same records and actions as the logistics page); pilot
 * shipments stay in their own staff-managed section.
 */
export function SavedDeliveryTracking({ role }: { role: LogisticsPortal }) {
  // Seller layout pads its content; buyer and admin routes render bare.
  const frame =
    role === "seller" ? "" : "flex-1 overflow-y-auto bg-neutral-50 px-4 py-5 sm:px-6 lg:px-8";
  return (
    <section className={`space-y-6 ${frame}`}>
      <div>
        <p className="text-xs font-bold tracking-widest text-emerald-700">DELIVERY TRACKING</p>
        <h1 className="mt-2 text-3xl font-bold">Saved shipments</h1>
        <p className="mt-2 max-w-3xl text-neutral-500">
          Shipment status saved to EcoGlobe and shared with the order participants. Locations are
          the saved origin and destination; live vehicle tracking is not available.
        </p>
      </div>
      <LogisticsWorkspace portal={role} scope="shipments" />
      <PilotShipmentsSection portal={role} />
    </section>
  );
}
