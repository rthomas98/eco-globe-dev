"use client";

import { useEffect, useState } from "react";
import type { CityLocationQuery } from "./city-location";

type CityLocation = { lat: number; lng: number; label: string };
const cache = new Map<string, CityLocation | null>();

export function useCityLocation(query?: CityLocationQuery) {
  const key = query ? new URLSearchParams({ ...query }).toString() : "";
  const [result, setResult] = useState<{
    key: string;
    location: CityLocation | null;
  }>({ key: "", location: null });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    async function resolve() {
      let location = cache.get(key) ?? null;
      if (!cache.has(key)) {
        try {
          const response = await fetch(`/api/map-city?${key}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("City lookup unavailable");
          const data = await response.json();
          const value = data.location;
          if (
            value &&
            typeof value.lat === "number" &&
            typeof value.lng === "number" &&
            Number.isFinite(value.lat) &&
            Number.isFinite(value.lng) &&
            Math.abs(value.lat) <= 90 &&
            Math.abs(value.lng) <= 180 &&
            typeof value.label === "string"
          )
            location = value;
          cache.set(key, location);
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      if (!controller.signal.aborted) setResult({ key, location });
    }
    void resolve();
    return () => controller.abort();
  }, [key]);
  return {
    location: key && result.key === key ? result.location : null,
    loading: Boolean(key && result.key !== key),
  };
}
