"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw } from "lucide-react";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { fetchLabRequests, updateLabSharing, type LabRequest, type LabSharing } from "@/lib/lab-testing-api";
import { canChangeSharing, describeRequestProgress, labStatusLabel, turnaroundLabel, formatLabDate } from "@/lib/lab-testing";
import { fetchListings, type BackendListing } from "@/lib/listings-api";
import { LabReportCard } from "./lab-report-card";
import { ListingLabReports } from "./listing-lab-reports";

type RequesterState =
  | { status: "loading" }
  | { status: "ready"; requests: LabRequest[] }
  | { status: "error"; message: string };

/**
 * Buyer Documents: every lab testing request the company placed, its
 * progress, the attached batch reports, and the sharing consent control.
 * Withdrawing consent removes seller and public access immediately.
 */
function RequesterLabReports() {
  const [state, setState] = useState<RequesterState>({ status: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchLabRequests()
      .then((requests) => {
        if (!cancelled) setState({ status: "ready", requests });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isBackendApiError(error) && (error.kind === "unauthorized" || error.kind === "forbidden")) {
          setState({ status: "ready", requests: [] });
          return;
        }
        setState({ status: "error", message: describeBackendError(error, "Lab testing requests could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const setSharing = async (request: LabRequest, sharing: LabSharing) => {
    if (busyId) return;
    if (sharing === "private" && !window.confirm("Withdraw sharing? The seller and other buyers immediately lose access to this report and its download.")) return;
    setBusyId(request.id);
    setActionError(null);
    try {
      const updated = await updateLabSharing(request.id, sharing);
      setState((prev) => (prev.status === "ready" ? { status: "ready", requests: prev.requests.map((r) => (r.id === updated.id ? updated : r)) } : prev));
    } catch (error: unknown) {
      setActionError(describeBackendError(error, "The sharing preference could not be changed."));
    }
    setBusyId(null);
  };

  if (state.status === "loading") return <p className="text-sm text-neutral-500" role="status">Loading lab testing requests…</p>;
  if (state.status === "error") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={reload} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
      </div>
    );
  }
  if (state.requests.length === 0) {
    return <p className="text-sm text-neutral-500">No lab testing requests yet. Request testing from a listing page or when you request a sample.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {actionError && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{actionError}</p>}
      {state.requests.map((request) => (
        <article key={request.id} className="rounded-xl bg-white p-4" style={{ border: "1px solid #E0E0E0" }} aria-label={`Lab testing request LAB-${request.id}`}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900">LAB-{request.id} · <Link href={`/buyer/browse/${request.listingId}`} className="underline">{request.listingTitle}</Link></p>
              <p className="text-xs text-neutral-600">{describeRequestProgress(request.status)}</p>
              <p className="text-xs text-neutral-500">
                Requested {formatLabDate(request.createdAt.slice(0, 10))} · {turnaroundLabel(request.turnaround)}
                {request.sampleRequestId ? ` · from sample request #${request.sampleRequestId}` : ""}
                {request.panelId === null ? " · testing scope to be confirmed" : ""}
              </p>
            </div>
            <span className="w-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">{labStatusLabel(request.status)}</span>
          </div>
          {request.reports.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {request.reports.map((report) => <LabReportCard key={report.id} report={report} />)}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{request.sharing === "shared" ? "You consented to share reports with the seller and the listing." : "Reports are private to your company."}</span>
            <button
              type="button"
              disabled={busyId === request.id || !canChangeSharing(request.status)}
              onClick={() => void setSharing(request, request.sharing === "shared" ? "private" : "shared")}
              className="w-fit font-semibold text-neutral-900 underline disabled:opacity-50"
            >
              {busyId === request.id ? "Saving…" : request.sharing === "shared" ? "Withdraw sharing" : "Share with the seller and the listing"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

type OwnedState =
  | { status: "loading" }
  | { status: "ready"; listings: BackendListing[] }
  | { status: "error"; message: string };

/** Seller Documents: shared, published batch reports on the company's own listings. */
function SellerLabReports() {
  const [state, setState] = useState<OwnedState>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchListings("owned")
      .then((listings) => {
        if (!cancelled) setState({ status: "ready", listings });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Your listings could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (state.status === "loading") return <p className="text-sm text-neutral-500" role="status">Loading your listings…</p>;
  if (state.status === "error") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={reload} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
      </div>
    );
  }
  const published = state.listings.filter((l) => l.listingStatusCode === "published" || l.listingStatusCode === "paused");
  if (published.length === 0) return <p className="text-sm text-neutral-500">Shared lab reports appear here once buyers test one of your published listings and consent to sharing.</p>;
  return (
    <div className="flex flex-col gap-4">
      {published.map((listing) => (
        <section key={listing.id} aria-labelledby={`lab-listing-${listing.id}`}>
          <h3 id={`lab-listing-${listing.id}`} className="mb-2 text-sm font-semibold text-neutral-900">
            <Link href={`/seller/listings/${listing.id}`} className="underline">{listing.title}</Link>
          </h3>
          <ListingLabReports listingId={listing.id} compact emptyText="No shared lab report on this listing." />
        </section>
      ))}
    </div>
  );
}

/** Documents-page block for lab reports. Internal admins use the queue instead. */
export function LabReportsSection({ role }: { role: "buyer" | "seller" | "admin" }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200" aria-labelledby="lab-reports-heading">
      <div className="mb-3 flex items-start gap-2">
        <FlaskConical className="mt-0.5 size-5 text-neutral-700" aria-hidden="true" />
        <div>
          <h2 id="lab-reports-heading" className="text-lg font-bold text-neutral-900">Independent lab reports</h2>
          <p className="text-xs text-neutral-500">Batch reports from third-party laboratories arranged through EcoGlobe. Each report describes one batch and sample date.</p>
        </div>
      </div>
      {role === "buyer" && <RequesterLabReports />}
      {role === "seller" && <SellerLabReports />}
      {role === "admin" && (
        <p className="text-sm text-neutral-600">Attach and publish reports from the <Link href="/admin/lab-testing" className="font-semibold underline">lab testing queue</Link>.</p>
      )}
    </section>
  );
}
