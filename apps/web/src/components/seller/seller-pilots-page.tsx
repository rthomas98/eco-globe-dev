"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { SellerLayout } from "./seller-layout";
import { fetchSellerPilotInterest, type SellerPilotInterest } from "@/lib/api-pilots";
import { describeBackendError } from "@/lib/backend-client";
import { formatCentralShortDate, formatLoads, pilotStatusLabel } from "@/lib/pilots";

type State = { status: "loading" } | { status: "ready"; requests: SellerPilotInterest[] } | { status: "error"; message: string };

/**
 * `/seller/pilots` — pilot interest in this seller's listings. The buyer is
 * shown only as tonnage and region until they choose to proceed.
 */
export function SellerPilotsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchSellerPilotInterest()
      .then((requests) => {
        if (!cancelled) setState({ status: "ready", requests });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Pilot interest could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <SellerLayout title="Pilot interest">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900">Pilot interest</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Buyers asking EcoGlobe to arrange a plant-scale trial of your material. EcoGlobe confirms availability and dates with you
          directly; the buyer&apos;s company is shown only once they decide to proceed.
        </p>

        {state.status === "loading" && <p className="py-16 text-center text-sm text-neutral-600" role="status">Loading pilot interest…</p>}
        {state.status === "error" && (
          <div className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700" role="alert">
            <p>{state.message}</p>
            <button type="button" onClick={() => setVersion((v) => v + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold underline">
              <RefreshCw className="size-3" /> Retry
            </button>
          </div>
        )}
        {state.status === "ready" && state.requests.length === 0 && (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-neutral-600" style={{ border: "1px solid #E0E0E0" }}>
            No pilot interest yet.
          </div>
        )}
        {state.status === "ready" && state.requests.length > 0 && (
          <ul className="mt-6 flex flex-col gap-3">
            {state.requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl bg-white p-5 sm:flex-row sm:items-center sm:justify-between" style={{ border: "1px solid #E0E0E0" }}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-neutral-900">{r.reference}</span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">{pilotStatusLabel(r.status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {r.listingTitle} · {formatLoads(r.loadCount, r.approximateTonnage)} · to {r.destinationRegion}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  {r.buyerCompanyName ? (
                    <>
                      <p className="font-bold text-neutral-900">{r.buyerCompanyName}</p>
                      {r.buyerConsentedAt && <p className="text-xs text-neutral-500">Agreed to proceed · {formatCentralShortDate(r.buyerConsentedAt)}</p>}
                    </>
                  ) : (
                    <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Buyer name shared when they proceed</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SellerLayout>
  );
}
