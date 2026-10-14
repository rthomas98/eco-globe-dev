"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Listing } from "@/components/public/browse-listings";
import { describeBackendError } from "./backend-client";
import {
  fetchListing,
  fetchListings,
  type BackendListing,
  type ListingScope,
} from "./listings-api";
import { toListing } from "./listing-view";
import { currentListingsState, listingsResultKey } from "./listings-result-key";
import { useDemoUser, readDemoUser, clearDemoUser } from "./demo-user";
import { refreshBackendSession } from "./backend-auth";
import { BackendApiError } from "./backend-client";

// Several listing hooks can mount at once (catalogue, map, favourites); they
// share one in-flight session check instead of each calling /auth/session.
let inflightRefresh: Promise<unknown> | null = null;
function sharedSessionRefresh() {
  if (!inflightRefresh) {
    inflightRefresh = refreshBackendSession().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

/** Revalidate server-owned listing visibility after login, logout or company changes. */
function useListingViewerKey() {
  const user = useDemoUser();
  return user
    ? `${user.id ?? user.email}:${user.activeCompanyId ?? ""}:${user.role}`
    : "guest";
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
  options: { search?: string; enabled?: boolean; portfolioId?: number } = {},
): ListingsState {
  const { search, enabled = true, portfolioId } = options;
  const viewerKey = useListingViewerKey();
  // Cards from one viewer/company or portfolio must never be shown while
  // another one loads.
  const resultKey = listingsResultKey({ viewerKey, scope, search, portfolioId });
  const loadedKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<Omit<ListingsState, "reload"> & { key: string | null }>({
    status: "loading",
    listings: [],
    records: [],
    error: null,
    key: null,
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "ready", listings: [], records: [], error: null, key: resultKey });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const sameResult = loadedKeyRef.current === resultKey;
    setState((prev) =>
      sameResult
        ? { ...prev, status: "loading", error: null }
        : { status: "loading", listings: [], records: [], error: null, key: null },
    );
    (async () => {
      // Public pages must not treat a cached profile as a valid server session.
      // The listings request is authorized server-side from the same session
      // cookie, so it runs in parallel with the session check instead of
      // after it; a 401 still clears the cached profile, which changes the
      // viewer key and refetches as a guest.
      const [records] = await Promise.all([
        fetchListings(scope, { search, portfolioId, signal: controller.signal }),
        readDemoUser()
          ? sharedSessionRefresh().catch((error: unknown) => {
              if (error instanceof BackendApiError && error.status === 401) clearDemoUser();
              else throw error;
            })
          : Promise.resolve(),
      ]);
      return records;
    })()
      .then((records) => {
        if (cancelled) return;
        loadedKeyRef.current = resultKey;
        setState({
          status: "ready",
          key: resultKey,
          records,
          listings: records.map((record) => {
            const listing = toListing(record);
            return listing.teaser && readDemoUser()
              ? {
                  ...listing,
                  price: "Complete company setup to see price",
                  moq: "Company setup required",
                }
              : listing;
          }),
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        loadedKeyRef.current = null;
        setState({
          status: "error",
          records: [],
          listings: [],
          error: describeBackendError(error, "Listings could not be loaded."),
          key: resultKey,
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [scope, search, enabled, version, viewerKey, portfolioId, resultKey]);

  // Before the effect runs for a new portfolio/search, a result that belongs to
  // the previous one reads as loading rather than showing stale cards.
  return { ...currentListingsState(state, resultKey, enabled), reload };
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
  const [state, setState] = useState<
    Omit<ListingDetailState, "reload" | "replace">
  >({
    status: "loading",
    listing: null,
    record: null,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const replace = useCallback((record: BackendListing) => {
    setState({
      status: "ready",
      record,
      listing: toListing(record),
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!idOrSlug) {
      setState({
        status: "not-found",
        listing: null,
        record: null,
        error: null,
      });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    fetchListing(idOrSlug, scope)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setState({
            status: "not-found",
            listing: null,
            record: null,
            error: null,
          });
          return;
        }
        setState({
          status: "ready",
          record,
          listing: toListing(record),
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          listing: null,
          record: null,
          error: describeBackendError(
            error,
            "The listing could not be loaded.",
          ),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [idOrSlug, scope, enabled, version, viewerKey]);

  return { ...state, reload, replace };
}
