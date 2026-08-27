"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/components/public/browse-listings";

/** Shape returned by the Azure backend's GET /api/listings. */
export interface ApiListing {
  id: number;
  sellerCompanyId: number;
  sellerCompanyName: string;
  locationId: number;
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
  minimumOrderQuantity: number;
  pricePerUnit: number;
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
    api.sellerCompanyName.toLowerCase(),
  ];

  return {
    id: api.slug,
    title: api.title,
    location: formatLocation(api),
    distance: "—",
    moq: `${api.minimumOrderQuantity} ${api.quantityUnit}`,
    co2: hasCarbonData ? `${api.carbonIntensityKgCo2e} kg CO₂e` : "—",
    price: `${symbol}${api.pricePerUnit}`,
    unit: `/${singularUnit(api.quantityUnit)}`,
    image: "/products/generated/bagasse.png",
    tags,
    lng: api.locationLongitude ?? 0,
    lat: api.locationLatitude ?? 0,
    category:
      CATEGORY_BY_MATERIAL_TYPE[api.materialTypeCode] ?? "Industrial Byproducts",
    grade: "Standard",
    priceNum: api.pricePerUnit,
    co2Num: api.carbonIntensityKgCo2e ?? 0,
    qtyNum: api.quantity,
    hasCarbonData,
    state: "Solid",
    frequency: "One-time",
    availabilityFrom: undefined,
    availabilityTo: undefined,
    additionalSpecs: api.description
      ? [{ label: "Seller notes", value: api.description }]
      : undefined,
    sdsUrl: undefined,
    sellerName: api.sellerCompanyName,
    apiListingId: api.id,
  };
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

/**
 * Published listings from the Azure backend, mapped to the UI Listing shape.
 * Returns [] until loaded; errors resolve to [] so demo data still renders.
 */
export function useApiListings(): Listing[] {
  const [items, setItems] = useState<Listing[]>(cachedListings ?? []);

  useEffect(() => {
    if (cachedListings) return;
    let cancelled = false;
    fetchApiListings()
      .then((listings) => {
        cachedListings = listings;
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
