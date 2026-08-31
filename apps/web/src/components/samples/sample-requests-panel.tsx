"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FlaskConical, ShoppingCart, Truck, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  fetchSampleRequests,
  stashSampleConversion,
  updateSampleRequest,
  type ApiSampleRequest,
} from "@/lib/api-samples";

const STATUS_TONES: Record<ApiSampleRequest["status"], { bg: string; fg: string; label: string }> = {
  requested: { bg: "#FEF3C7", fg: "#92400E", label: "Requested" },
  accepted: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Accepted" },
  declined: { bg: "#FEE2E2", fg: "#991B1B", label: "Declined" },
  shipped: { bg: "#EDE9FE", fg: "#5B21B6", label: "Shipped" },
  received: { bg: "#DCFCE7", fg: "#166534", label: "Received" },
};

/**
 * Live sample-request queue shared by both sides of the marketplace:
 * sellers accept/decline and mark shipped; buyers confirm receipt.
 * Renders nothing while the viewer has no sample requests.
 */
export function SampleRequestsPanel({ role }: { role: "buyer" | "seller" }) {
  const router = useRouter();
  const [samples, setSamples] = useState<ApiSampleRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    fetchSampleRequests()
      .then(setSamples)
      .catch(() => {});
  }, []);

  useEffect(reload, [reload]);

  const act = async (
    sample: ApiSampleRequest,
    patch: Parameters<typeof updateSampleRequest>[1],
  ) => {
    if (busyId) return;
    setBusyId(sample.id);
    setError("");
    try {
      await updateSampleRequest(sample.id, patch);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
    setBusyId(null);
  };

  const markShipped = (sample: ApiSampleRequest) => {
    const trackingNumber =
      window.prompt("Tracking number (optional):")?.trim() || undefined;
    void act(sample, { status: "shipped", trackingNumber });
  };

  // Sends the buyer to the product page; checkout links the placed order
  // back to this sample so both sides see the conversion.
  const orderInBulk = (sample: ApiSampleRequest) => {
    stashSampleConversion(sample.id, sample.listingId);
    router.push(`/buyer/browse/${sample.listingSlug}`);
  };

  if (samples.length === 0) return null;

  return (
    <section
      className="mb-6 rounded-2xl bg-white p-5"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="size-5 text-neutral-700" />
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Sample requests</h2>
          <p className="text-xs text-neutral-500">
            {role === "seller"
              ? "Lab test batches buyers want before committing to a bulk order."
              : "Your lab test batches — confirm receipt when a sample arrives."}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {samples.map((sample) => {
          const tone = STATUS_TONES[sample.status];
          return (
            <div
              key={sample.id}
              className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
              style={{ border: "1px solid #F0F0F0" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">
                  {sample.quantityLb} lb · {sample.listingTitle}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {role === "seller"
                    ? `For ${sample.buyerCompanyName}`
                    : `From ${sample.sellerCompanyName}`}
                  {sample.deliveryAddress ? ` · ${sample.deliveryAddress}` : ""}
                  {sample.trackingNumber ? ` · Tracking ${sample.trackingNumber}` : ""}
                </p>
                {sample.note && (
                  <p className="mt-1 truncate text-xs text-neutral-500 italic">
                    &ldquo;{sample.note}&rdquo;
                  </p>
                )}
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {tone.label}
              </span>
              {sample.convertedOrderId && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "#DCFCE7", color: "#166534" }}
                >
                  Ordered · EG-{sample.convertedOrderId}
                </span>
              )}

              {role === "seller" && sample.status === "requested" && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId === sample.id}
                    onClick={() => void act(sample, { status: "declined" })}
                  >
                    <X className="size-4" /> Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busyId === sample.id}
                    onClick={() => void act(sample, { status: "accepted" })}
                  >
                    <Check className="size-4" /> Accept
                  </Button>
                </>
              )}
              {role === "seller" && sample.status === "accepted" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busyId === sample.id}
                  onClick={() => markShipped(sample)}
                >
                  <Truck className="size-4" /> Mark shipped
                </Button>
              )}
              {role === "buyer" && sample.status === "shipped" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busyId === sample.id}
                  onClick={() => void act(sample, { status: "received" })}
                >
                  <Check className="size-4" /> Mark received
                </Button>
              )}
              {role === "buyer" &&
                sample.status === "received" &&
                !sample.convertedOrderId && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => orderInBulk(sample)}
                  >
                    <ShoppingCart className="size-4" /> Order in bulk
                  </Button>
                )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
