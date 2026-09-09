"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { describeBackendError } from "@/lib/backend-client";
import { fetchLabReportsForListing, type LabReport } from "@/lib/lab-testing-api";
import { LabReportCard } from "./lab-report-card";

type State =
  | { status: "loading" }
  | { status: "ready"; reports: LabReport[] }
  | { status: "error"; message: string };

/**
 * Lab reports attached to one listing, as the backend lets this viewer see
 * them (shared + published for sellers/public; private ones for the
 * requester and internal staff). Used in seller Documents.
 */
export function ListingLabReports({ listingId, compact = false, emptyText }: { listingId: number; compact?: boolean; emptyText?: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchLabReportsForListing(listingId)
      .then((reports) => {
        if (!cancelled) setState({ status: "ready", reports });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: describeBackendError(error, "Lab reports could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, version]);

  if (state.status === "loading") return <p className="text-sm text-neutral-500" role="status">Checking for lab reports…</p>;
  if (state.status === "error") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={reload} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
      </div>
    );
  }
  if (state.reports.length === 0) return <p className="text-sm text-neutral-500">{emptyText ?? "No independent lab reports are shared on this listing."}</p>;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {state.reports.map((report) => <LabReportCard key={report.id} report={report} compact={compact} />)}
    </div>
  );
}
