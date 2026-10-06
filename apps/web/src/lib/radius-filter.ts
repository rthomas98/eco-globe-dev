export interface RadiusOrigin {
  lat: number;
  lng: number;
}

interface Locatable {
  id: string;
  lat: number | null;
  lng: number | null;
}

/** True for finite latitude/longitude within range. */
export function isValidPoint(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Great-circle distance in miles (haversine). */
export function milesBetween(a: RadiusOrigin, b: RadiusOrigin): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  // Floating-point error can push h just outside [0, 1].
  // Same mean Earth radius (miles) as the backend radius filter.
  return 2 * 3958.7613 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export interface RadiusResult<T> {
  /** Listings to show: all of them when no radius applies. */
  items: T[];
  /** Miles from the origin for every listing with a saved facility pin. */
  distances: Map<string, number>;
  /** True when a radius and an origin were both available. */
  applied: boolean;
  /** Listings hidden because they lie outside the radius. */
  outside: number;
  /** Listings hidden because they have no saved facility pin to measure. */
  unlocated: number;
}

/**
 * Filter listings to those within `radiusMiles` of `origin`. Listings without
 * coordinates cannot be measured, so under an active radius they are left out
 * and counted rather than assumed to be nearby. An invalid origin (NaN or
 * out of range) or a non-finite/non-positive radius leaves the list unfiltered.
 */
export function filterByRadius<T extends Locatable>(
  listings: T[],
  origin: RadiusOrigin | null | undefined,
  radiusMiles: number | null | undefined,
): RadiusResult<T> {
  const distances = new Map<string, number>();
  const validOrigin = origin && isValidPoint(origin.lat, origin.lng) ? origin : null;
  if (validOrigin) {
    for (const listing of listings) {
      if (isValidPoint(listing.lat, listing.lng)) {
        distances.set(
          listing.id,
          milesBetween(validOrigin, { lat: listing.lat as number, lng: listing.lng as number }),
        );
      }
    }
  }
  const applied =
    !!validOrigin &&
    typeof radiusMiles === "number" &&
    Number.isFinite(radiusMiles) &&
    radiusMiles > 0;
  if (!applied) {
    return { items: listings, distances, applied: false, outside: 0, unlocated: 0 };
  }
  let outside = 0;
  let unlocated = 0;
  const items = listings.filter((listing) => {
    const miles = distances.get(listing.id);
    if (miles === undefined) {
      unlocated += 1;
      return false;
    }
    if (miles > radiusMiles) {
      outside += 1;
      return false;
    }
    return true;
  });
  return { items, distances, applied, outside, unlocated };
}

export function formatMiles(miles: number | undefined) {
  if (miles === undefined) return "—";
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles).toLocaleString("en-US")} mi`;
}
