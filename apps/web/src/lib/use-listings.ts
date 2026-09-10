"use client";

import { useCallback, useEffect, useState } from "react";
import type { Listing } from "@/components/public/browse-listings";
import { describeBackendError } from "./backend-client";
import {
  fetchListing,
  fetchListings,
  type BackendListing,
  type ListingScope,
} from "./listings-api";
import { toListing } from "./listing-view";
import { useDemoUser } from "./demo-user";

/** Revalidate server-owned listing visibility after login, logout or company changes. */
function useListingViewerKey() {
  const user = useDemoUser();
  return user ? `${user.id ?? user.email}:${user.activeCompanyId ?? ""}:${user.role}` : "guest";
}

export type LoadStatus = "loading" | "ready" | "error" | "not-found";

export interface ListingsState {
  status: Exclude<LoadStatus, "not-found">;
  listings: Listing[];
  records: BackendListing[];
  error: string | null;
  reload: () => void;
}

/**
 * Load persisted listings from the backend.
 * `public` returns published records only; `owned` returns the active
 * company's records including drafts and requires a session.
 */
export function useListings(
  scope: ListingScope,
  options: { search?: string; enabled?: boolean } = {},
): ListingsState {
  const { search, enabled = true } = options;
  const viewerKey = useListingViewerKey();
  const [state, setState] = useState<Omit<ListingsState, "reload">>({
    status: "loading",
    listings: [],
    records: [],
    error: null,
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "ready", listings: [], records: [], error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    fetchListings(scope, { search })
      .then((records) => {
        if (cancelled) return;
        setState({
          status: "ready",
          records,
          listings: records.map(toListing),
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          records: [],
          listings: [],
          error: describeBackendError(error, "Listings could not be loaded."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [scope, search, enabled, version, viewerKey]);

  return { ...state, reload };
}

export interface ListingDetailState {
  status: LoadStatus;
  listing: Listing | null;
  record: BackendListing | null;
  error: string | null;
  reload: () => void;
  /** Replace the loaded record after a successful write. */
  replace: (record: BackendListing) => void;
}

/** Load one persisted listing by canonical id or slug; unknown ids are not-found. */
export function useListing(
  idOrSlug: string | undefined,
  scope: ListingScope,
  options: { enabled?: boolean } = {},
): ListingDetailState {
  const { enabled = true } = options;
  const viewerKey = useListingViewerKey();
  const [state, setState] = useState<Omit<ListingDetailState, "reload" | "replace">>({
    status: "loading",
    listing: null,
    record: null,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const replace = useCallback((record: BackendListing) => {
    setState({ status: "ready", record, listing: toListing(record), error: null });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!idOrSlug) {
      setState({ status: "not-found", listing: null, record: null, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    fetchListing(idOrSlug, scope)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setState({ status: "not-found", listing: null, record: null, error: null });
          return;
        }
        setState({ status: "ready", record, listing: toListing(record), error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          listing: null,
          record: null,
          error: describeBackendError(error, "The listing could not be loaded."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [idOrSlug, scope, enabled, version, viewerKey]);

  return { ...state, reload, replace };
}
