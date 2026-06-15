"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemoUser } from "./demo-user";

export type ViewerLocationSource = "browser" | "saved";
export type ViewerLocationStatus =
  | "checking"
  | "ready"
  | "fallback"
  | "denied"
  | "unavailable";

export interface ViewerLocation {
  lat: number;
  lng: number;
  label: string;
  source: ViewerLocationSource;
  accuracy?: number;
}

const CACHE_KEY = "ecoglobe.viewerLocation";
const CACHE_MAX_AGE_MS = 1000 * 60 * 10;

function isValidCoord(lat?: number, lng?: number) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function readCachedLocation(): ViewerLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ViewerLocation & { savedAt?: number };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    if (!isValidCoord(parsed.lat, parsed.lng)) return null;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      label: parsed.label || "Current browser location",
      source: "browser",
      accuracy: parsed.accuracy,
    };
  } catch {
    return null;
  }
}

function writeCachedLocation(location: ViewerLocation) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...location, savedAt: Date.now() }),
    );
  } catch {
    // Location cache is a convenience only.
  }
}

export function useViewerLocation() {
  const user = useDemoUser();
  const savedFacility = useMemo(
    () => user?.facilities?.find((facility) => isValidCoord(facility.lat, facility.lng)),
    [user?.facilities],
  );
  const savedLocation = useMemo<ViewerLocation | null>(() => {
    if (!savedFacility || !isValidCoord(savedFacility.lat, savedFacility.lng)) return null;
    return {
      lat: savedFacility.lat!,
      lng: savedFacility.lng!,
      label: savedFacility.label,
      source: "saved",
    };
  }, [savedFacility]);

  const [location, setLocation] = useState<ViewerLocation | null>(null);
  const [status, setStatus] = useState<ViewerLocationStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    const useSavedFallback = (fallbackStatus: ViewerLocationStatus) => {
      if (cancelled) return;
      if (savedLocation) {
        setLocation(savedLocation);
        setStatus("fallback");
      } else {
        setLocation(null);
        setStatus(fallbackStatus);
      }
    };

    const cached = readCachedLocation();
    if (cached) {
      setLocation(cached);
      setStatus("ready");
    } else if (savedLocation) {
      setLocation(savedLocation);
      setStatus("fallback");
    } else {
      setLocation(null);
      setStatus("checking");
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      useSavedFallback("unavailable");
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const nextLocation: ViewerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Current browser location",
          source: "browser",
          accuracy: position.coords.accuracy,
        };
        setLocation(nextLocation);
        setStatus("ready");
        writeCachedLocation(nextLocation);
      },
      (error) => {
        useSavedFallback(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false,
        maximumAge: CACHE_MAX_AGE_MS,
        timeout: 5000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [savedLocation]);

  return { location, status };
}
