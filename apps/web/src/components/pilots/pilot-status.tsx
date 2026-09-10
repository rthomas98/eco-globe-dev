"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Truck } from "lucide-react";
import type { PilotRequest } from "@/lib/api-pilots";
import { proceedWithPilot } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import {
  canBuyerProceed,
  centralZoneAbbreviation,
  describeBuyerStage,
  formatCentralDateTime,
  formatLoads,
  laneLabel,
  pilotStatusLabel,
} from "@/lib/pilots";

const border = { border: "1px solid #E0E0E0" } as const;

const STAGES: { key: string; label: string }[] = [
  { key: "call", label: "Call" },
  { key: "call_held", label: "Seller confirmed" },
  { key: "working_lane", label: "Movement worked out" },
  { key: "offer_sent", label: "Offer with you" },
  { key: "won", label: "Moving" },
];

function stageIndex(status: string) {
  switch (status) {
    case "new":
    case "call_booked":
      return 0;
    case "call_held":
      return 1;
    case "working_lane":
      return 2;
    case "offer_sent":
      return 3;
    case "won":
      return 4;
    default:
      return -1;
  }
}

/** Buyer view once scheduling is behind them: progress, the offer decision and the shipment. */
export function PilotStatus({ request, onUpdated }: { request: PilotRequest; onUpdated: (request: PilotRequest) => void }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const index = stageIndex(request.status);
  const closed = request.status === "lost";

  const proceed = async () => {
    if (!consent || busy) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await proceedWithPilot(request.id));
    } catch (err) {
      setError(describeBackendError(err, "Your decision could not be recorded."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-8" style={border} aria-labelledby="pilot-status-heading">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="pilot-status-heading" className="text-3xl font-bold text-neutral-900">
          {request.reference}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${closed ? "bg-neutral-100 text-neutral-600" : request.status === "won" ? "bg-green-100 text-green-800" : "bg-amber-50 text-amber-800"}`}>
          {pilotStatusLabel(request.status)}
        </span>
      </div>
      <p className="mt-2 text-base text-neutral-500">
        {request.listingTitle} · {formatLoads(request.loadCount, request.approximateTonnage)} · {laneLabel(request.originLabel, request.destinationLabel)}
      </p>
      <p className="mt-4 text-base text-neutral-800">{describeBuyerStage(request.status, request.contactPreference)}</p>

      {request.callStartsAt && !closed && (
        <p className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          Call {index > 0 ? "held" : "booked"}: {formatCentralDateTime(request.callStartsAt)} ({centralZoneAbbreviation(request.callStartsAt)})
          {request.ownerName ? ` with ${request.ownerName}` : ""}.
        </p>
      )}

      {!closed && (
        <ol className="mt-6 flex flex-col gap-3" aria-label="Progress">
          {STAGES.map((stage, i) => {
            const done = i < index || (i === index && request.status === "won");
            const current = i === index && !done;
            return (
              <li key={stage.key} className="flex items-center gap-3 text-base">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-green-100 text-green-800" : current ? "border-2 border-amber-600" : "border-2 border-neutral-200"}`}
                  aria-hidden="true"
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={done ? "text-neutral-900" : current ? "font-bold text-amber-800" : "text-neutral-400"}>{stage.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {canBuyerProceed(request.status) && (
        <div className="mt-8 rounded-2xl bg-neutral-900 p-6 text-white">
          <h2 className="text-xl font-bold">Ready to proceed?</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            You have agreed the terms of this pilot with EcoGlobe off-platform. Proceeding records that agreement and shares your
            company name with {request.sellerCompanyName}. Nothing is charged here.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-green-500" />
            <span>
              I confirm we agreed the pilot terms off-platform and consent to EcoGlobe sharing our company with the seller.
            </span>
          </label>
          {error && (
            <p className="mt-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-100" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={proceed}
            disabled={!consent || busy}
            className="mt-5 w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Recording…" : "Proceed with this pilot"}
          </button>
        </div>
      )}

      {request.status === "won" && (
        <div className="mt-8 flex gap-4 rounded-2xl bg-green-50 p-5 text-sm text-green-900">
          <Truck className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-base font-bold">{request.shipmentId ? `Shipment SHP-${request.shipmentId} is open in fulfilment, awaiting coordination.` : "EcoGlobe is handing this pilot to fulfilment."}</p>
            <p className="mt-1">
              {request.buyerConsentedAt ? `You agreed on ${formatCentralDateTime(request.buyerConsentedAt)} (${centralZoneAbbreviation(request.buyerConsentedAt)}). ` : ""}
              Movement details are arranged with you directly; no carrier is booked or charged through this page.
            </p>
            {request.shipmentId && (
              <Link href="/buyer/logistics" className="mt-2 inline-block font-semibold underline">
                Open logistics
              </Link>
            )}
          </div>
        </div>
      )}

      {request.constraints.length > 0 && (
        <p className="mt-6 text-sm text-neutral-500">Receiving constraints: {request.constraints.join(" · ")}</p>
      )}
      {request.neededBy && <p className="mt-1 text-sm text-neutral-500">Needed by: {request.neededBy}</p>}
    </section>
  );
}
