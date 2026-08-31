"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, FileText, Filter, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  fetchAllListingDocuments,
  listingDocumentLabel,
  setListingDocumentVerification,
  type ApiListingDocument,
} from "@/lib/api-listing-documents";
import { portalDate } from "@/lib/api-portal";

type Filter = "Pending" | "Verified" | "Rejected" | "All";

const FILTERS: Filter[] = ["Pending", "Verified", "Rejected", "All"];

function statusOf(doc: ApiListingDocument): Exclude<Filter, "All"> {
  if (doc.verificationStatusCode === "verified") return "Verified";
  if (doc.verificationStatusCode === "inactive") return "Rejected";
  return "Pending";
}

const STATUS_TONES: Record<Exclude<Filter, "All">, { bg: string; fg: string }> = {
  Pending: { bg: "#FEF3C7", fg: "#92400E" },
  Verified: { bg: "#DCFCE7", fg: "#166534" },
  Rejected: { bg: "#FEE2E2", fg: "#991B1B" },
};

/**
 * Compliance review queue for listing attachments (TDS / SDS / COA).
 * Approving or rejecting notifies the seller; buyers see the verified
 * badge on the product page.
 */
export function AdminDocumentReviewPage() {
  const [documents, setDocuments] = useState<ApiListingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("Pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    fetchAllListingDocuments()
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const decide = async (doc: ApiListingDocument, decision: "verified" | "inactive") => {
    if (busyId) return;
    setBusyId(doc.id);
    setError("");
    try {
      await setListingDocumentVerification(doc.id, decision);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    }
    setBusyId(null);
  };

  const counts = documents.reduce<Record<string, number>>((acc, doc) => {
    const status = statusOf(doc);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const visible = documents.filter(
    (doc) => filter === "All" || statusOf(doc) === filter,
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Document review</h1>
            <p className="mt-1 text-sm text-neutral-500">
              TDS, SDS, and COA files uploaded by sellers — approve so buyers
              see the verified badge, or reject to send it back.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {(["Pending", "Verified", "Rejected"] as const).map((status) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: STATUS_TONES[status].bg }}
              >
                <span className="font-bold" style={{ color: STATUS_TONES[status].fg }}>
                  {counts[status] ?? 0}
                </span>
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: STATUS_TONES[status].fg }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Filter className="size-4 text-neutral-500" />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === option
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
                style={filter !== option ? { border: "1px solid #E0E0E0" } : undefined}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
        )}

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {loading && (
            <p className="px-6 py-10 text-center text-sm text-neutral-500">
              Loading documents...
            </p>
          )}
          {!loading && visible.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-neutral-500">
              {filter === "Pending"
                ? "No documents waiting for review."
                : "No documents match this filter."}
            </p>
          )}
          {visible.map((doc, i) => {
            const status = statusOf(doc);
            const tone = STATUS_TONES[status];
            return (
              <div
                key={doc.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
                style={{ borderTop: i === 0 ? undefined : "1px solid #F4F4F5" }}
              >
                <FileText className="size-5 shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {doc.fileName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {listingDocumentLabel(doc.documentTypeCode)} ·{" "}
                    <Link
                      href={`/admin/listings/${doc.listingId}`}
                      className="underline hover:text-neutral-900"
                    >
                      {doc.listingTitle ?? `Listing LS-${doc.listingId}`}
                    </Link>{" "}
                    · {doc.sellerCompanyName ?? "Marketplace seller"} ·{" "}
                    {portalDate(doc.createdAt)}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  {status}
                </span>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
                >
                  <ExternalLink className="size-3.5" /> Open file
                </a>
                {status !== "Rejected" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId === doc.id}
                    onClick={() => void decide(doc, "inactive")}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                )}
                {status !== "Verified" && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busyId === doc.id}
                    onClick={() => void decide(doc, "verified")}
                  >
                    <Check className="size-4" />
                    {busyId === doc.id ? "Saving..." : "Approve"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
