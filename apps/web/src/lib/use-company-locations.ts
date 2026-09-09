"use client";

import { useCallback, useEffect, useState } from "react";
import type { Facility } from "./demo-user";
import { describeBackendError } from "./backend-client";
import { fetchCompanyLocations, type CompanyLocation } from "./listings-api";

export interface LocationsState {
  status: "loading" | "ready" | "error" | "no-company";
  locations: CompanyLocation[];
  error: string | null;
}

export function formatCompanyLocation(location: CompanyLocation) {
  return [location.addressLine1, location.city, location.stateProvince, location.postalCode, location.countryCode]
    .filter((part) => !!part)
    .join(", ");
}

/** Persisted company facilities from the backend (never browser-only profile data). */
export function useCompanyLocations(companyId: number | undefined, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const [state, setState] = useState<LocationsState>({ status: "loading", locations: [], error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (!companyId) {
      setState({ status: "no-company", locations: [], error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    fetchCompanyLocations(companyId)
      .then((locations) => {
        if (!cancelled) setState({ status: "ready", locations, error: null });
      })
      .catch((error) => {
        if (!cancelled)
          setState({
            status: "error",
            locations: [],
            error: describeBackendError(error, "Company locations could not be loaded."),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, version, enabled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const add = useCallback(
    (location: CompanyLocation) => setState((prev) => ({ ...prev, locations: [location, ...prev.locations] })),
    [],
  );

  return { ...state, reload, add };
}

/** Map persisted locations to the calculator's facility shape. */
export function locationsToFacilities(locations: CompanyLocation[]): Facility[] {
  return locations.map((location) => ({
    id: String(location.id),
    label: location.name,
    address: formatCompanyLocation(location),
    lat: location.latitude ?? undefined,
    lng: location.longitude ?? undefined,
  }));
}
