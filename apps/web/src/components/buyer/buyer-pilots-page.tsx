"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { BuyerLayout } from "./buyer-layout";
import { PilotViewTag } from "@/components/pilots/pilot-copy";
import { fetchPilotRequests, type PilotRequest } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import { canBuyerProceed, canBuyerSchedule, centralZoneAbbreviation, formatCentralDateTime, formatLoads, laneLabel, pilotStatusLabel } from "@/lib/pilots";

type State = { status: "loading" } | { status: "ready"; requests: PilotRequest[] } | { status: "error"; message: string };

function nextForBuyer(request: PilotRequest) {
  if (canBuyerSchedule(request.status)) {
    if (request.status === "call_booked" && request.callStartsAt)
      return `Call ${formatCentralDateTime(request.callStartsAt)} (${centralZoneAbbreviation(request.callStartsAt)})`;
    return request.contactPreference === "email" ? "We will email you" : "Pick a call time";
  }
  if (canBuyerProceed(request.status)) return "Your decision";
  if (request.status === "won") return request.shipmentId ? `Shipment SHP-${request.shipmentId}` : "Handing to fulfilment";
  if (request.status === "lost") return "Closed";
  return "With EcoGlobe";
}

/** `/buyer/pilots` — every pilot request for the active company. */
export function BuyerPilotsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchPilotRequests()
      .then((requests) => {
        if (!cancelled) setState({ status: "ready", requests });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Your pilot requests could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <PilotViewTag tone="buyer" label="Buyer view" detail="pilots — trial runs arranged with EcoGlobe" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Pilots</h1>
              <p className="mt-1 text-sm text-neutral-500">Plant-scale trials start from a listing. No pricing is shown online.</p>
            </div>
            <Link href="/buyer/browse" className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800">
              Browse listings
            </Link>
          </div>

          {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading pilot requests…</p>}
          {state.status === "error" && (
            <div className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
              <p>{state.message}</p>
              <button type="button" onClick={() => setVersion((v) => v + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
                <RefreshCw className="size-3" /> Retry
              </button>
            </div>
          )}
          {state.status === "ready" && state.requests.length === 0 && (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #E0E0E0" }}>
              <p className="text-lg font-bold text-neutral-900">No pilot requests yet</p>
              <p className="mt-1 text-sm text-neutral-500">Open a listing and choose “Request a pilot” to start one.</p>
            </div>
          )}
          {state.status === "ready" && state.requests.length > 0 && (
            <ul className="mt-6 flex flex-col gap-3">
              {state.requests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/buyer/pilots/${request.id}`}
                    className="flex flex-col gap-3 rounded-2xl bg-white p-5 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                    style={{ border: "1px solid #E0E0E0" }}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-neutral-900">{request.reference}</span>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
                          {pilotStatusLabel(request.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-neutral-600">
                        {request.listingTitle} · {formatLoads(request.loadCount, request.approximateTonnage)} · {laneLabel(request.originLabel, request.destinationLabel)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <span>{nextForBuyer(request)}</span>
                      <ChevronRight className="size-4 text-neutral-400" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
