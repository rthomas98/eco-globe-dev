"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check, FlaskConical, RefreshCw, Truck, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  fetchSampleRequests,
  updateSampleRequest,
  type ApiSampleRequest,
  type SampleRequestStatus,
} from "@/lib/api-samples";
import { LabTestingDialog } from "@/components/lab-testing/lab-testing-dialog";

const STATUS_TONES: Record<SampleRequestStatus, { bg: string; fg: string; label: string }> = {
  requested: { bg: "#FEF3C7", fg: "#92400E", label: "Requested" },
  accepted: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Accepted" },
  declined: { bg: "#FEE2E2", fg: "#991B1B", label: "Declined" },
  shipped: { bg: "#EDE9FE", fg: "#5B21B6", label: "Shipped" },
  received: { bg: "#DCFCE7", fg: "#166534", label: "Received" },
};

type State =
  | { status: "loading" }
  | { status: "ready"; samples: ApiSampleRequest[] }
  | { status: "error"; message: string };

/**
 * Sample-request queue shared by both sides of the marketplace, ported from
 * the live revision: sellers accept/decline and mark shipped; buyers confirm
 * receipt. The live "Order in bulk" conversion is intentionally absent
 * because the local checkout has no sample-conversion hook; buyers get a
 * plain link to the listing instead. Buyers can also request lab testing of
 * a sample from here (same form, same queue).
 */
export function SampleRequestsPanel({ role }: { role: "buyer" | "seller" }) {
  const headingId = useId();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<{ id: number; value: string } | null>(null);
  const [labFor, setLabFor] = useState<ApiSampleRequest | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    fetchSampleRequests()
      .then((samples) => {
        if (!cancelled) setState({ status: "ready", samples });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // No session or no company: the panel simply has nothing to show.
        if (isBackendApiError(error) && (error.kind === "unauthorized" || error.kind === "forbidden")) {
          setState({ status: "ready", samples: [] });
          return;
        }
        setState({ status: "error", message: describeBackendError(error, "Sample requests could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const act = async (sample: ApiSampleRequest, patch: Parameters<typeof updateSampleRequest>[1]) => {
    if (busyId) return;
    setBusyId(sample.id);
    setActionError(null);
    try {
      await updateSampleRequest(sample.id, patch);
      setTracking(null);
      reload();
    } catch (error: unknown) {
      setActionError(describeBackendError(error, "The sample request could not be updated."));
    }
    setBusyId(null);
  };

  // Hidden while there is nothing to show, matching the live behaviour.
  if (state.status === "ready" && state.samples.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }} aria-labelledby={headingId}>
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="size-5 text-neutral-700" aria-hidden="true" />
        <div>
          <h2 id={headingId} className="text-lg font-bold text-neutral-900">Sample requests</h2>
          <p className="text-xs text-neutral-500">
            {role === "seller"
              ? "Small test batches buyers want before committing to a bulk order."
              : "Your test batches — confirm receipt when a sample arrives."}
          </p>
        </div>
      </div>

      {state.status === "loading" && <p className="text-sm text-neutral-500" role="status">Loading sample requests…</p>}
      {state.status === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
        </div>
      )}
      {actionError && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{actionError}</p>}

      {state.status === "ready" && (
        <ul className="flex flex-col gap-2">
          {state.samples.map((sample) => {
            const tone = STATUS_TONES[sample.status] ?? STATUS_TONES.requested;
            const busy = busyId === sample.id;
            return (
              <li key={sample.id} className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ border: "1px solid #F0F0F0" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    #{sample.id} · {sample.quantityLb} lb · {sample.listingTitle}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {role === "seller" ? `For ${sample.buyerCompanyName}` : `From ${sample.sellerCompanyName}`}
                    {sample.deliveryAddress ? ` · ${sample.deliveryAddress}` : ""}
                    {sample.trackingNumber ? ` · Tracking ${sample.trackingNumber}` : ""}
                  </p>
                  {sample.note && <p className="mt-1 truncate text-xs italic text-neutral-500">&ldquo;{sample.note}&rdquo;</p>}
                  {sample.sellerResponse && <p className="mt-1 truncate text-xs text-neutral-500">Seller: {sample.sellerResponse}</p>}
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: tone.bg, color: tone.fg }}>{tone.label}</span>
                {sample.convertedOrderId && (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#DCFCE7", color: "#166534" }}>Ordered · EG-{sample.convertedOrderId}</span>
                )}

                {role === "seller" && sample.status === "requested" && (
                  <>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void act(sample, { status: "declined" })}><X className="size-4" aria-hidden="true" /> Decline</Button>
                    <Button variant="primary" size="sm" disabled={busy} onClick={() => void act(sample, { status: "accepted" })}><Check className="size-4" aria-hidden="true" /> Accept</Button>
                  </>
                )}
                {role === "seller" && sample.status === "accepted" && (
                  tracking?.id === sample.id ? (
                    <form className="flex w-full flex-wrap items-center gap-2 sm:w-auto" onSubmit={(e) => { e.preventDefault(); void act(sample, { status: "shipped", ...(tracking.value.trim() ? { trackingNumber: tracking.value.trim() } : {}) }); }}>
                      <label htmlFor={`tracking-${sample.id}`} className="sr-only">Tracking number (optional)</label>
                      <input id={`tracking-${sample.id}`} value={tracking.value} onChange={(e) => setTracking({ id: sample.id, value: e.target.value })} placeholder="Tracking number (optional)" className="h-9 min-w-0 flex-1 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20" style={{ border: "1px solid #E0E0E0" }} />
                      <Button type="submit" variant="primary" size="sm" disabled={busy}><Truck className="size-4" aria-hidden="true" /> Confirm shipped</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setTracking(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <Button variant="primary" size="sm" disabled={busy} onClick={() => setTracking({ id: sample.id, value: "" })}><Truck className="size-4" aria-hidden="true" /> Mark shipped</Button>
                  )
                )}
                {role === "buyer" && sample.status === "shipped" && (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => void act(sample, { status: "received" })}><Check className="size-4" aria-hidden="true" /> Mark received</Button>
                )}
                {role === "buyer" && sample.status !== "declined" && (
                  <Button variant="secondary" size="sm" onClick={() => setLabFor(sample)}><FlaskConical className="size-4" aria-hidden="true" /> Lab testing</Button>
                )}
                {role === "buyer" && (
                  <Link href={`/buyer/browse/${sample.listingId}`} className="text-xs font-semibold text-neutral-900 underline">View listing</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {labFor && (
        <LabTestingDialog
          listing={{ id: labFor.listingId, title: labFor.listingTitle, sellerCompanyName: labFor.sellerCompanyName }}
          sampleRequestId={labFor.id}
          onClose={() => setLabFor(null)}
        />
      )}
    </section>
  );
}
