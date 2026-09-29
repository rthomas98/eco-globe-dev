"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { describeBackendError } from "@/lib/backend-client";

export type LoadStatus = "loading" | "ready" | "error";

export interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
  /** The thrown value behind `error`, for callers that branch on status. */
  rawError?: unknown;
  reload: () => void;
}

/**
 * Loads one authenticated backend read. Failures surface as an error state;
 * no fallback or example records are ever substituted.
 */
export function useBackendData<T>(
  load: () => Promise<T>,
  deps: React.DependencyList,
  fallbackError = "This information could not be loaded.",
): LoadState<T> {
  const [version, setVersion] = useState(0);
  // Data from a previous scope (company, id, filter) is never shown for a new
  // one; it is kept only while the same scope reloads. Each result is tagged
  // with the scope it belongs to, and a mismatch reads as loading during the
  // same render, before any effect runs.
  const scopeKey = JSON.stringify(deps);
  const [state, setState] = useState<Omit<LoadState<T>, "reload"> & { scopeKey: string }>({
    status: "loading",
    data: null,
    error: null,
    scopeKey,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({
      status: "loading",
      data: prev.scopeKey === scopeKey ? prev.data : null,
      error: null,
      scopeKey,
    }));
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null, scopeKey });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            data: null,
            error: describeBackendError(error, fallbackError),
            rawError: error,
            scopeKey,
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  if (state.scopeKey !== scopeKey) return { status: "loading", data: null, error: null, reload };
  const { scopeKey: _scope, ...current } = state;
  return { ...current, reload };
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-neutral-500">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
      <Inbox className="size-6 text-neutral-400" />
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-neutral-500">{description}</p>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center"
    >
      <AlertTriangle className="size-6 text-red-500" />
      <p className="max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
          style={{ border: "1px solid #E0E0E0" }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Renders loading/error/empty for a load, or the children when data is present. */
export function DataBoundary<T>({
  state,
  isEmpty,
  empty,
  loadingLabel,
  children,
}: {
  state: LoadState<T>;
  isEmpty?: (data: T) => boolean;
  empty: { title: string; description?: string };
  loadingLabel?: string;
  children: (data: T) => React.ReactNode;
}) {
  if (state.status === "loading" && state.data === null)
    return <LoadingState label={loadingLabel} />;
  if (state.status === "error")
    return (
      <ErrorState
        message={state.error ?? "This information could not be loaded."}
        onRetry={state.reload}
      />
    );
  if (state.data === null) return <LoadingState label={loadingLabel} />;
  if (isEmpty?.(state.data)) return <EmptyState {...empty} />;
  return <>{children(state.data)}</>;
}
