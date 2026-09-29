"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Check, X, Eye, Package } from "lucide-react";
import { fetchAllListings, moderateListing, type ApiAdminListing } from "@/lib/api-portal";
import { listingImageForTitle } from "@/lib/api-orders";
import { describeBackendError } from "@/lib/backend-client";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

type ModStatus = "Pending" | "Published" | "Paused" | "Draft";

function statusOf(listing: ApiAdminListing): ModStatus | null {
  switch (listing.listingStatusCode) {
    case "pending_review":
      return "Pending";
    case "published":
      return "Published";
    case "paused":
      return "Paused";
    case "draft":
      return "Draft";
    default:
      return null; // closed and other terminal states are not moderated
  }
}

const STATUSES: Array<ModStatus | "All"> = ["All", "Pending", "Published", "Paused", "Draft"];

export function AdminModerationPage() {
  const listings = useBackendData(fetchAllListings, [], "Listings could not be loaded.");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // A decision is shown only after the backend saves it and the list is re-read.
  const decide = async (listing: ApiAdminListing, decision: "approve" | "reject") => {
    setBusyId(listing.id);
    setActionError(null);
    try {
      await moderateListing(listing.id, decision);
      listings.reload();
    } catch (error) {
      setActionError(
        describeBackendError(error, `The decision for “${listing.title}” was not saved.`),
      );
    } finally {
      setBusyId(null);
    }
  };
  const [filter, setFilter] = useState<ModStatus | "All">("Pending");
  const matches = (listing: ApiAdminListing) => {
    const status = statusOf(listing);
    return status !== null && (filter === "All" || status === filter);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Listing moderation</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Approve listings submitted for review or return them to the seller as drafts.
              Changes are saved to the listing before they appear here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === s
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={filter !== s ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}

        <DataBoundary
          state={listings}
          loadingLabel="Loading listings…"
          isEmpty={(rows) => rows.filter(matches).length === 0}
          empty={{
            title: filter === "Pending" ? "No listings awaiting review" : "No listings match this filter",
            description: "Listings appear here when sellers submit them for review.",
          }}
        >
          {(rows) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.filter(matches).map((item) => {
                const status = statusOf(item) as ModStatus;
                const image = listingImageForTitle(item.title);
                const busy = busyId === item.id;
                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl bg-white"
                    style={{ border: "1px solid #F0F0F0" }}
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-neutral-100">
                      {image ? (
                        <img src={image} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-8 text-neutral-400" />
                      )}
                      <div className="absolute left-3 top-3">
                        <ModBadge status={status} />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{item.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{item.sellerCompanyName}</p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-400">LS-{item.id}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <Link
                          href={`/admin/listings/LS-${item.id}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
                          style={{ border: "1px solid #E0E0E0" }}
                        >
                          <Eye className="size-3" />
                          Review
                        </Link>
                        {status !== "Draft" && (
                          <button
                            disabled={busy}
                            onClick={() => void decide(item, "reject")}
                            className="flex size-8 items-center justify-center rounded-full bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            title="Return to seller as draft"
                            aria-label={`Return ${item.title} to draft`}
                          >
                            <X className="size-3" />
                          </button>
                        )}
                        {status !== "Published" && (
                          <button
                            disabled={busy}
                            onClick={() => void decide(item, "approve")}
                            className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
                            title="Approve and publish"
                            aria-label={`Publish ${item.title}`}
                          >
                            <Check className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DataBoundary>
      </div>
    </div>
  );
}

function ModBadge({ status }: { status: ModStatus }) {
  const tone: Record<ModStatus, { bg: string; fg: string }> = {
    Pending: { bg: "#FEF3C7", fg: "#92400E" },
    Paused: { bg: "#FFEDD5", fg: "#C2410C" },
    Published: { bg: "#DCFCE7", fg: "#166534" },
    Draft: { bg: "#F4F4F5", fg: "#3F3F46" },
  };
  const t = tone[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {status}
    </span>
  );
}
