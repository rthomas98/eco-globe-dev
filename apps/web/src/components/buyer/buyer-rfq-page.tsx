"use client";

import { useDemoUser } from "@/lib/demo-user";

import { useState } from "react";
import { fetchWantedListings, type ApiWantedListing } from "@/lib/api-portal";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { RfqResponses } from "./rfq-responses";
import {
  describeNeedBy,
  describeWantedQuantity,
  describeWantedRegion,
  describeWantedTargetPrice,
  isViewOnlyMember,
  wantedStatus,
} from "@/lib/wanted-listing-format";

type RFQStatus = "Draft" | "Open" | "Closed";

interface RFQ {
  id: string;
  wantedId: number;
  responses: number | null;
  product: string;
  category: string;
  quantity: string;
  status: RFQStatus;
  created: string;
  notes?: string | null;
  location: string;
  targetPrice: string;
  needBy: string;
}

const FILTERS: Array<RFQStatus | "All"> = ["All", "Draft", "Open", "Closed"];

const STATUS_LABEL: Record<ReturnType<typeof wantedStatus>, RFQStatus> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

function toRfq(w: ApiWantedListing): RFQ {
  return {
    id: `RFQ-${w.id}`,
    wantedId: w.id,
    responses: w.responseCount ?? null,
    notes: w.notes,
    location: describeWantedRegion(w),
    targetPrice: describeWantedTargetPrice(w),
    needBy: describeNeedBy(w),
    product: w.title,
    category: w.materialTypeName,
    quantity: describeWantedQuantity(w),
    status: STATUS_LABEL[wantedStatus(w)],
    created: new Date(w.createdAt).toISOString().slice(0, 10),
  };
}

export function BuyerRfqPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<RFQStatus | "All">("All");
  const user = useDemoUser();
  const companyId = user?.activeCompanyId;
  const viewOnly = isViewOnlyMember(user);
  const wanted = useBackendData(
    () => fetchWantedListings(true),
    [companyId],
    "Your requests for quote could not be loaded.",
  );
  const rows = (wanted.data ?? []).map(toRfq);

  const visible = rows.filter((r) => filter === "All" || r.status === filter);

  return (
    <BuyerLayout>
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Requests for quote</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Submit a spec when you can&apos;t find a listing that fits. Your open
              requests are visible to sellers on EcoGlobe; drafts stay private to your company.
            </p>
          </div>
          {viewOnly ? (
            <p className="text-xs text-neutral-500">View-only access: you can review requests but not create or edit them.</p>
          ) : (
            <Link href="/buyer/rfq/new">
              <Button variant="primary" size="md">
                <Plus className="size-4" />
                New request for quote
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
              style={filter !== f ? { border: "1px solid #E0E0E0" } : undefined}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {wanted.status === "loading" && !wanted.data ? (
            <LoadingState label="Loading requests…" />
          ) : wanted.status === "error" ? (
            <ErrorState message={wanted.error ?? "Your requests could not be loaded."} onRetry={wanted.reload} />
          ) : visible.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-neutral-700">
                {rows.length === 0
                  ? "You have no requests for quote yet."
                  : filter === "Draft"
                    ? "You have no draft requests."
                    : "No requests for quote match."}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Start a new request to save a draft or reach sellers.</p>
            </div>
          ) : (
            visible.map((r, i) => (
              <div key={r.id}>
              <button
                type="button"
                aria-expanded={selected === r.id}
                aria-controls={`details-${r.id}`}
                onClick={() => setSelected(selected === r.id ? null : r.id)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
                style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-neutral-500">{r.id}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">{r.category}</span>
                  </div>
                  <p className="mt-1 break-words text-sm font-semibold text-neutral-900">{r.product}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {r.quantity} · {r.status === "Draft" ? "created" : "submitted"} {r.created}
                  </p>
                </div>
                {r.status !== "Draft" && r.responses !== null && (
                  <span className="text-sm text-neutral-700">
                    {r.responses} response{r.responses === 1 ? "" : "s"}
                  </span>
                )}
                <ChevronRight className={`mt-2 size-4 text-neutral-500 transition-transform ${selected === r.id ? "rotate-90" : ""}`} />
              </button>
              {selected === r.id && (
                <section id={`details-${r.id}`} aria-label={`${r.id} details`} className="border-t border-neutral-100 bg-neutral-50 px-5 py-6">
                  <h2 className="text-lg font-semibold">Request details</h2>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {[['Material', r.product], ['Category', r.category], ['Quantity', r.quantity], [r.status === 'Draft' ? 'Created' : 'Submitted', r.created], ['Status', r.status], ['Need by', r.needBy], ['Delivery region', r.location], ['Target unit price', r.targetPrice]].map(([label, value]) => (
                      <div key={label} className="min-w-0"><dt className="text-neutral-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>
                    ))}
                  </dl>
                  <h3 className="mt-6 font-semibold">Requirements and notes</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700">{r.notes || 'No additional requirements provided.'}</p>
                  {r.status === "Draft" ? (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-neutral-600">Private draft — not visible to sellers until it is submitted.</p>
                      {!viewOnly && (
                        <Link href={`/buyer/rfq/${r.wantedId}/edit`}>
                          <Button variant="primary" size="md">Resume draft</Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <>
                      <h3 className="mt-6 font-semibold">Seller responses</h3>
                      <RfqResponses wantedListingId={r.wantedId} />
                    </>
                  )}
                </section>
              )}
              </div>
            ))
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

function StatusBadge({ status }: { status: RFQStatus }) {
  const tone: Record<RFQStatus, { bg: string; fg: string }> = {
    Draft: { bg: "#FEF3C7", fg: "#92400E" },
    Open: { bg: "#DBEAFE", fg: "#1E40AF" },
    Closed: { bg: "#F1F5F9", fg: "#475569" },
  };
  const t = tone[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      {status}
    </span>
  );
}
