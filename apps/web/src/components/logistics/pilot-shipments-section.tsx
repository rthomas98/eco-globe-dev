"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, RefreshCw } from "lucide-react";
import { fetchShipments, type ApiShipment } from "@/lib/api-fulfilment";
import { PILOT_AWAITING_COORDINATION_LABEL } from "./logistics-demo-data";
import { describeBackendError } from "@/lib/backend-client";

type State = { status: "loading" } | { status: "ready"; shipments: ApiShipment[] } | { status: "error"; message: string };

const border = { border: "1px solid #E0E0E0" } as const;

export type PilotShipmentsPortal = "admin" | "buyer" | "seller";

const PORTAL_COPY: Record<PilotShipmentsPortal, { intro: string; linkHref: string; linkLabel: string }> = {
  admin: { intro: "Movements handed over after a buyer agreed a pilot. Referenced by pilot, not by order.", linkHref: "/admin/pilots", linkLabel: "Pilot desk" },
  buyer: { intro: "Pilots you agreed to proceed with. EcoGlobe arranges the movement with you directly; there is nothing to quote, book or pay here.", linkHref: "/buyer/pilots", linkLabel: "Your pilots" },
  seller: { intro: "Pilots the buyer agreed to proceed with. EcoGlobe coordinates the movement with you directly; no quote or dispatch action is needed here.", linkHref: "/seller/pilots", linkLabel: "Pilot interest" },
};

function pilotHref(portal: PilotShipmentsPortal, pilotRequestId: number) {
  if (portal === "admin") return `/admin/pilots/${pilotRequestId}`;
  if (portal === "buyer") return `/buyer/pilots/${pilotRequestId}`;
  // Sellers have no per-request page; the interest list is the right landing.
  return "/seller/pilots";
}

/**
 * Shipments created from buyer-agreed pilots. They carry a pilot reference
 * instead of an order, are staff-managed, and never show a price, quote,
 * booking or delivery control in any portal. The API already scopes the list
 * to the caller (admins see all; buyers and sellers only their consented pilots).
 */
export function PilotShipmentsSection({ portal = "admin" }: { portal?: PilotShipmentsPortal }) {
  const copy = PORTAL_COPY[portal];
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchShipments()
      .then((all) => {
        if (!cancelled) setState({ status: "ready", shipments: all.filter((s) => s.pilotRequestId != null) });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Pilot shipments could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <section className="rounded-2xl bg-white p-5" style={border} aria-labelledby="pilot-shipments-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pilot-shipments-heading" className="inline-flex items-center gap-2 text-lg font-bold text-neutral-900">
          <Handshake className="size-5 text-green-800" aria-hidden="true" /> Pilot shipments
        </h2>
        <Link href={copy.linkHref} className="text-sm font-semibold text-neutral-700 underline">
          {copy.linkLabel}
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{copy.intro}</p>
      {state.status === "loading" && <p className="mt-4 text-sm text-neutral-600" role="status">Loading pilot shipments…</p>}
      {state.status === "error" && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {state.message}{" "}
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="inline-flex items-center gap-1 font-semibold underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </p>
      )}
      {state.status === "ready" && state.shipments.length === 0 && <p className="mt-4 text-sm text-neutral-600">No pilot shipments yet.</p>}
      {state.status === "ready" && state.shipments.length > 0 && (
        <ul className="mt-4 divide-y" style={{ borderColor: "#F0F0F0" }}>
          {state.shipments.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-sm">
                <p className="font-bold text-neutral-900">SHP-{s.id}</p>
                <p className="text-neutral-600">
                  <Link href={pilotHref(portal, s.pilotRequestId as number)} className="font-semibold underline">
                    Pilot PR-{s.pilotRequestId}
                  </Link>
                  {" · "}
                  {s.carrierName ?? "No carrier booked"}
                  {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
                {s.shipmentStatusCode === "quote_pending" ? PILOT_AWAITING_COORDINATION_LABEL : s.shipmentStatusName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
