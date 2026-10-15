"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useDemoUser } from "@/lib/demo-user";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { fetchListingSdsRequest, requestListingSds } from "@/lib/api-listing-sds-requests";
import type { ListingSdsRequestState } from "@/lib/listing-sds-request";

type NoticeState =
  | { phase: "loading" }
  | { phase: "load-error"; error: string }
  | { phase: "unavailable" }
  | { phase: "ready"; sdsRequest: ListingSdsRequestState; submitting: boolean; submitError: string | null };

const requestedDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const isNotFound = (error: unknown) => isBackendApiError(error) && error.kind === "not-found";

/**
 * Missing-SDS notice for a buyer company viewing someone else's listing.
 * Shows the persisted request state from the backend and lets the buyer ask
 * the seller (in-app only) to upload the SDS. Nothing is shown as requested
 * until the backend confirms it, and purchase stays with the listing itself.
 */
export function SdsRequestNotice({ listingId, onRefreshListing }: { listingId: number; onRefreshListing: () => void }) {
  const user = useDemoUser();
  const scope = user?.activeCompanyId ? `${user.id}:${user.activeCompanyId}:${listingId}` : null;
  const [state, setState] = useState<NoticeState & { scope: string | null }>({ phase: "loading", scope: null });
  const [version, setVersion] = useState(0);
  // Scope a POST was sent for; a reply after logout or a company switch is ignored.
  const currentScope = useRef(scope);
  const submitting = useRef(false);
  useEffect(() => {
    currentScope.current = scope;
  }, [scope]);

  useEffect(() => {
    submitting.current = false;
    if (!scope) return;
    let cancelled = false;
    setState({ phase: "loading", scope });
    fetchListingSdsRequest(listingId)
      .then((sdsRequest) => {
        if (!cancelled) setState({ phase: "ready", sdsRequest, submitting: false, submitError: null, scope });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState(
          isNotFound(error)
            ? { phase: "unavailable", scope }
            : { phase: "load-error", error: describeBackendError(error, "The SDS request status could not be loaded."), scope },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [scope, listingId, version]);

  const submit = async () => {
    if (!scope || submitting.current || state.phase !== "ready" || state.sdsRequest.status !== "not_requested") return;
    submitting.current = true;
    const requestScope = scope;
    setState({ ...state, submitting: true, submitError: null });
    try {
      const { sdsRequest } = await requestListingSds(listingId);
      if (currentScope.current !== requestScope) return;
      setState({ phase: "ready", sdsRequest, submitting: false, submitError: null, scope: requestScope });
    } catch (error) {
      if (currentScope.current !== requestScope) return;
      if (isBackendApiError(error) && error.kind === "conflict") {
        // 409: a usable SDS exists now; the listing itself must be reloaded to show it.
        setState({ phase: "ready", sdsRequest: { status: "available", listingId }, submitting: false, submitError: null, scope: requestScope });
      } else if (isNotFound(error)) {
        setState({ phase: "unavailable", scope: requestScope });
      } else {
        setState((prev) =>
          prev.phase === "ready" && prev.scope === requestScope
            ? { ...prev, submitting: false, submitError: describeBackendError(error, "The SDS request could not be sent. Please try again.") }
            : prev,
        );
      }
    } finally {
      if (currentScope.current === requestScope) submitting.current = false;
    }
  };

  const blocked = (
    <p className="flex items-start gap-1.5 text-xs text-amber-700">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      Seller hasn&apos;t uploaded the SDS yet — purchase blocked.
    </p>
  );
  const refreshButton = (
    <button type="button" onClick={onRefreshListing} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-neutral-900 underline">
      <RefreshCw className="size-3" /> Refresh listing
    </button>
  );
  const box = (children: React.ReactNode) => (
    <div className="mt-2 flex flex-col gap-2 rounded-md bg-amber-50 px-3 py-2" data-testid="sds-request-notice">
      {children}
    </div>
  );

  if (!scope) return box(blocked);
  if (state.scope !== scope || state.phase === "loading") {
    return box(<>{blocked}<p className="text-xs text-neutral-600" role="status">Checking SDS request status…</p></>);
  }
  if (state.phase === "load-error") {
    return box(
      <>
        {blocked}
        <p className="text-xs text-red-700" role="alert">{state.error}</p>
        <button type="button" onClick={() => setVersion((v) => v + 1)} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-neutral-900 underline">
          <RefreshCw className="size-3" /> Retry
        </button>
      </>,
    );
  }
  if (state.phase === "unavailable") {
    return box(
      <>
        <p className="flex items-start gap-1.5 text-xs text-amber-700" role="status">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          This listing is no longer available to buyers, so an SDS can&apos;t be requested.
        </p>
        {refreshButton}
      </>,
    );
  }

  const { sdsRequest } = state;
  if (sdsRequest.status === "available") {
    return box(
      <>
        <p className="flex items-start gap-1.5 text-xs text-neutral-700" role="status">
          <CheckCircle className="mt-0.5 size-3 shrink-0 text-green-700" />
          An SDS is available. Refresh the listing to view it.
        </p>
        {refreshButton}
      </>,
    );
  }
  if (sdsRequest.status === "requested") {
    return box(
      <>
        {blocked}
        <p className="flex items-start gap-1.5 text-xs text-neutral-700" role="status">
          <CheckCircle className="mt-0.5 size-3 shrink-0 text-green-700" />
          <span>
            SDS requested on <time dateTime={sdsRequest.requestedAt}>{requestedDate(sdsRequest.requestedAt)}</time>. The seller was notified in EcoGlobe.
          </span>
        </p>
      </>,
    );
  }
  return box(
    <>
      {blocked}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={state.submitting}
        aria-busy={state.submitting}
        className="w-full rounded-full bg-white py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900/40 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: "1px solid #E0E0E0" }}
      >
        {state.submitting ? "Sending request…" : "Request SDS from seller"}
      </button>
      {state.submitError && <p className="text-xs text-red-700" role="alert">{state.submitError}</p>}
    </>,
  );
}
