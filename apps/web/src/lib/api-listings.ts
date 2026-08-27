"use client";

import { useEffect, useState } from "react";
import {
  listings as staticListings,
  type Listing,
} from "@/components/public/browse-listings";

/** Shape returned by the Azure backend's GET /api/listings. */
export interface ApiListing {
  id: number;
  /** Present when the server redacted licensed fields for this viewer. */
  teaser?: boolean;
  sellerCompanyId: number | null;
  sellerCompanyName: string | null;
  locationId: number | null;
  locationCity?: string | null;
  locationStateProvince?: string | null;
  locationCountryCode?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  title: string;
  slug: string;
  materialTypeCode: string;
  materialTypeName?: string | null;
  quantity: number;
  quantityUnit: string;
  minimumOrderQuantity: number | null;
  pricePerUnit: number | null;
  currencyCode: string;
  listingStatusCode: string;
  carbonIntensityKgCo2e: number | null;
  description: string | null;
}

const CATEGORY_BY_MATERIAL_TYPE: Record<string, string> = {
  industrial_byproduct: "Industrial Byproducts",
  low_co2_feedstock: "Biomass & Wood",
  certified_feedstock: "Biomass & Wood",
  used_product: "Used products",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
};

function formatLocation(api: ApiListing) {
  const parts = [api.locationCity, api.locationStateProvince].filter(Boolean);
  if (parts.length === 0 && api.locationCountryCode) {
    return api.locationCountryCode;
  }
  return parts.join(", ") || "Location on request";
}

function singularUnit(unit: string) {
  return unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

/** Convert a backend listing into the UI Listing shape used across the app. */
export function mapApiListingToUi(api: ApiListing): Listing {
  const symbol = CURRENCY_SYMBOLS[api.currencyCode] ?? "$";
  const hasCarbonData =
    api.carbonIntensityKgCo2e !== null && api.carbonIntensityKgCo2e !== undefined;
  const tags = [
    api.materialTypeName?.toLowerCase() ?? api.materialTypeCode.replace(/_/g, " "),
    ...(api.sellerCompanyName ? [api.sellerCompanyName.toLowerCase()] : []),
  ];
  const priceLocked = api.pricePerUnit === null || api.pricePerUnit === undefined;

  // Seeded API listings share slugs with the curated demo catalogue — reuse
  // that twin's imagery and merchandising while the API supplies live data.
  const staticTwin = staticListings.find((listing) => listing.id === api.slug);

  return {
    // Merchandising fields fall back to the curated twin when present.
    id: api.slug,
    title: api.title,
    location: formatLocation(api),
    distance: staticTwin?.distance ?? "—",
    moq: priceLocked
      ? "Members only"
      : `${api.minimumOrderQuantity} ${api.quantityUnit}`,
    co2: hasCarbonData ? `${api.carbonIntensityKgCo2e} kg CO₂e` : "—",
    price: priceLocked ? "—" : `${symbol}${api.pricePerUnit}`,
    unit: `/${singularUnit(api.quantityUnit)}`,
    image: staticTwin?.image ?? "/products/generated/bagasse.png",
    tags: staticTwin?.tags ?? tags,
    lng: api.locationLongitude ?? staticTwin?.lng ?? 0,
    lat: api.locationLatitude ?? staticTwin?.lat ?? 0,
    category:
      staticTwin?.category ??
      CATEGORY_BY_MATERIAL_TYPE[api.materialTypeCode] ??
      "Industrial Byproducts",
    grade: staticTwin?.grade ?? "Standard",
    priceNum: api.pricePerUnit ?? 0,
    co2Num: api.carbonIntensityKgCo2e ?? 0,
    qtyNum: api.quantity,
    hasCarbonData,
    state: staticTwin?.state ?? "Solid",
    quality: staticTwin?.quality,
    composition: staticTwin?.composition,
    frequency: staticTwin?.frequency ?? "One-time",
    availabilityFrom: staticTwin?.availabilityFrom,
    availabilityTo: staticTwin?.availabilityTo,
    additionalSpecs: api.description
      ? [{ label: "Seller notes", value: api.description }]
      : staticTwin?.additionalSpecs,
    sdsUrl: staticTwin?.sdsUrl,
    sellerFacilityId: staticTwin?.sellerFacilityId,
    sellerName: api.sellerCompanyName ?? undefined,
    apiListingId: api.id,
  };
}

/** Fire-and-forget interest signal for the seller's aggregate analytics. */
export function recordListingInterest(
  apiListingId: number | undefined,
  eventType: "view" | "detail_view" | "cart_add" | "quote_request",
) {
  if (!apiListingId) return;
  void fetch(`/api/backend/api/listings/${apiListingId}/interest`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType }),
  }).catch(() => {
    // Interest analytics are best-effort.
  });
}

export async function fetchApiListings(): Promise<Listing[]> {
  const response = await fetch(
    "/api/backend/api/listings?statusCode=published",
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new Error(`Listings request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as {
    ok: boolean;
    listings?: ApiListing[];
  };
  if (!payload.ok || !Array.isArray(payload.listings)) {
    throw new Error("Listings response was malformed.");
  }
  return payload.listings.map(mapApiListingToUi);
}

let cachedListings: Listing[] | null = null;
let cachedViewer: "anon" | "member" | null = null;

function currentViewer(): "anon" | "member" {
  try {
    return typeof window !== "undefined" &&
      window.localStorage.getItem("ecoglobe.demoUser")
      ? "member"
      : "anon";
  } catch {
    return "anon";
  }
}

/**
 * Published listings from the Azure backend, mapped to the UI Listing shape.
 * Returns [] until loaded; errors resolve to [] so demo data still renders.
 * The cache is keyed by viewer state so signing in swaps teasers for the
 * full licensed detail.
 */
export function useApiListings(): Listing[] {
  const [items, setItems] = useState<Listing[]>(() =>
    cachedListings && cachedViewer === currentViewer() ? cachedListings : [],
  );

  useEffect(() => {
    const viewer = currentViewer();
    if (cachedListings && cachedViewer === viewer) {
      setItems(cachedListings);
      return;
    }
    let cancelled = false;
    fetchApiListings()
      .then((listings) => {
        cachedListings = listings;
        cachedViewer = viewer;
        if (!cancelled) setItems(listings);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
