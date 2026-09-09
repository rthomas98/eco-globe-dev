"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Lock, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  fetchLabReportsForListing,
  fetchLabRequests,
  type LabReport,
  type LabRequest,
} from "@/lib/lab-testing-api";
import { describeRequestProgress, labStatusLabel, RESULTS_DESCRIBE_A_BATCH } from "@/lib/lab-testing";
import { LabReportCard } from "./lab-report-card";
import { LabTestingDialog } from "./lab-testing-dialog";
import type { LabTestingListingContext } from "./lab-testing-form";

type State =
  | { status: "loading" }
  | { status: "ready"; reports: LabReport[]; requests: LabRequest[] }
  | { status: "error"; message: string };

/**
 * "Independent analysis" block for the listing page analysis area. Shows
 * shared (and the viewer's private) batch reports when they exist; otherwise
 * the referral button. Sellers viewing their own listing see reports only.
 * Anonymous visitors see the shared reports and a sign-in prompt.
 */
export function ListingAnalysis({
  listing,
  viewer,
}: {
  listing: LabTestingListingContext;
  viewer: { signedIn: boolean; canRequest: boolean; isOwner: boolean };
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const reports = fetchLabReportsForListing(listing.id);
    const requests = viewer.signedIn
      ? fetchLabRequests({ listingId: listing.id }).catch((error: unknown) => {
          // Requests are company-scoped; a missing session hides them, never the reports.
          if (isBackendApiError(error) && (error.kind === "unauthorized" || error.kind === "forbidden")) return [];
          throw error;
        })
      : Promise.resolve([] as LabRequest[]);
    Promise.all([reports, requests])
      .then(([r, q]) => {
        if (!cancelled) setState({ status: "ready", reports: r, requests: q });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Independent analysis could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [listing.id, viewer.signedIn, version]);

  const openRequests = state.status === "ready" ? state.requests.filter((r) => r.status !== "completed" && r.status !== "cancelled") : [];
  const reports = state.status === "ready" ? state.reports : [];

  return (
    <section aria-labelledby="listing-analysis-heading" className="mb-10">
      <h2 id="listing-analysis-heading" className="mb-4 text-xl font-bold text-neutral-900">Independent analysis</h2>
      {state.status === "loading" && <p className="rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600" role="status">Checking for independent reports…</p>}
      {state.status === "error" && (
        <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
        </div>
      )}
      {state.status === "ready" && (
        <div className="flex flex-col gap-4">
          {reports.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reports.map((report) => <LabReportCard key={report.id} report={report} />)}
              </div>
              <p className="text-xs text-neutral-500">{RESULTS_DESCRIBE_A_BATCH}. Each report covers the batch and sample date shown; it is not a specification for the whole stream.</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl px-6 py-8 text-center" style={{ border: "1px dashed #D4D4D4" }}>
              <FlaskConical className="size-6 text-neutral-400" aria-hidden="true" />
              <p className="text-sm text-neutral-700">No independent analysis on this listing yet.</p>
            </div>
          )}

          {openRequests.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Your lab testing requests for this listing">
              {openRequests.map((request) => (
                <li key={request.id} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-neutral-900">Lab testing request LAB-{request.id} · {labStatusLabel(request.status)}</p>
                  <p className="text-xs text-neutral-600">{describeRequestProgress(request.status)}</p>
                </li>
              ))}
            </ul>
          )}

          {viewer.isOwner ? (
            <p className="text-xs text-neutral-500">Buyers can request independent testing of this listing; shared reports appear here and in your Documents.</p>
          ) : viewer.canRequest ? (
            <div className="flex flex-col gap-1">
              <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
                <FlaskConical className="size-4" aria-hidden="true" /> {reports.length > 0 ? "Request additional testing" : "Request lab testing"}
              </Button>
              <p className="text-xs text-neutral-500">Arranged by EcoGlobe · you decide who sees it · nothing is charged now.</p>
            </div>
          ) : viewer.signedIn ? (
            <p className="text-xs text-neutral-500">Lab testing requests need an active company membership. Complete onboarding to request testing.</p>
          ) : (
            <p className="text-xs text-neutral-500 inline-flex items-center gap-1"><Lock className="size-3" aria-hidden="true" /><Link href="/login" className="font-medium text-neutral-900 underline">Sign in</Link> to request lab testing.</p>
          )}
        </div>
      )}
      {open && (
        <LabTestingDialog
          listing={listing}
          onClose={() => setOpen(false)}
          onSubmitted={() => reload()}
        />
      )}
    </section>
  );
}
