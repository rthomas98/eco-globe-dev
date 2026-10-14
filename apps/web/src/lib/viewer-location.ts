"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompanyLocations, locationsToFacilities } from "./use-company-locations";
import { useDemoUser } from "./demo-user";
import {
  VIEWER_CACHE_KEY,
  VIEWER_CACHE_MAX_AGE_MS,
  isValidCoord,
  parseCachedBrowserLocation,
  requestIpLocation,
  resolveViewerLocation,
  serializeBrowserLocation,
  type ViewerLocation,
  type ViewerLocationCandidates,
  type ViewerLocationStatus,
} from "./viewer-location-core";

export type {
  ViewerLocation,
  ViewerLocationSource,
  ViewerLocationStatus,
} from "./viewer-location-core";

export interface ViewerLocationState {
  location: ViewerLocation | null;
  status: ViewerLocationStatus;
}

const GEOLOCATION_TIMEOUT_MS = 5000;
/** The approximate IP lookup gives up quickly so the map never waits on it. */
const IP_LOOKUP_TIMEOUT_MS = 4000;

function readCachedLocation(): ViewerLocation | null {
  try {
    return parseCachedBrowserLocation(
      localStorage.getItem(VIEWER_CACHE_KEY),
      Date.now(),
    );
  } catch {
    return null;
  }
}

function writeCachedLocation(location: ViewerLocation) {
  // Only precise browser fixes are cached; the IP approximation stays in memory.
  const value = serializeBrowserLocation(location, Date.now());
  if (!value) return;
  try {
    localStorage.setItem(VIEWER_CACHE_KEY, value);
  } catch {
    // Location cache is a convenience only.
  }
}

/**
 * Where the viewer is browsing from: the browser's own location when allowed,
 * then the approximate same-origin IP location, then a saved company facility.
 * Pass `enabled: false` when a parent already resolved the location.
 */
export function useViewerLocation({ enabled = true }: { enabled?: boolean } = {}): ViewerLocationState {
  const user = useDemoUser();
  const companyLocations = useCompanyLocations(user?.activeCompanyId, { enabled });
  const savedFacility = useMemo(
    () =>
      locationsToFacilities(companyLocations.locations).find((facility) =>
        isValidCoord(facility.lat, facility.lng),
      ),
    [companyLocations.locations],
  );
  const savedLat = savedFacility?.lat;
  const savedLng = savedFacility?.lng;
  const savedLabel = savedFacility?.label;
  const saved = useMemo<ViewerLocation | null>(
    () =>
      savedLat !== undefined && savedLng !== undefined && isValidCoord(savedLat, savedLng)
        ? { lat: savedLat, lng: savedLng, label: savedLabel ?? "Company facility", source: "saved" }
        : null,
    [savedLat, savedLng, savedLabel],
  );

  const [candidates, setCandidates] = useState<Omit<ViewerLocationCandidates, "saved">>({
    browser: null,
    browserState: "pending",
    ip: null,
    ipState: "idle",
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const ipController = new AbortController();

    const cached = readCachedLocation();
    if (cached) {
      setCandidates({ browser: cached, browserState: "ready", ip: null, ipState: "idle" });
    } else {
      setCandidates({ browser: null, browserState: "pending", ip: null, ipState: "pending" });
      void requestIpLocation(fetch, ipController.signal, IP_LOOKUP_TIMEOUT_MS).then((ip) => {
        if (cancelled) return;
        setCandidates((current) => ({ ...current, ip, ipState: "done" }));
      });
    }

    const geolocation =
      typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geolocation) {
      if (!cached) setCandidates((current) => ({ ...current, browserState: "unavailable" }));
      return () => {
        cancelled = true;
        ipController.abort();
      };
    }

    geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        if (!isValidCoord(position.coords.latitude, position.coords.longitude)) {
          setCandidates((current) =>
            current.browser ? current : { ...current, browserState: "unavailable" },
          );
          return;
        }
        const next: ViewerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your current location",
          source: "browser",
          accuracy: position.coords.accuracy,
        };
        writeCachedLocation(next);
        // A precise fix makes the pending IP lookup irrelevant.
        ipController.abort();
        setCandidates((current) => ({
          ...current,
          browser: next,
          browserState: "ready",
          ipState: current.ipState === "pending" ? "done" : current.ipState,
        }));
      },
      (error) => {
        if (cancelled) return;
        // Never let a late failure replace a cached or earlier browser fix.
        setCandidates((current) =>
          current.browser
            ? current
            : {
                ...current,
                browserState:
                  error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
              },
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: VIEWER_CACHE_MAX_AGE_MS,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );

    return () => {
      cancelled = true;
      ipController.abort();
    };
  }, [enabled]);

  return useMemo(
    () => resolveViewerLocation({ ...candidates, saved }),
    [candidates, saved],
  );
}
