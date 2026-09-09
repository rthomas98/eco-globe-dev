import type { Listing } from "./browse-listings";
import { formatQuantityWithUnitName } from "@/lib/listing-format";

/**
 * Presentation model for a persisted listing on the public and buyer detail
 * pages. Every value is derived from the saved record; nothing is invented.
 */
export interface ProductDetailModel {
  id: string;
  title: string;
  location: string;
  moq: string;
  co2: string;
  /** Recorded unit price, or null when the seller has not set one. */
  price: number | null;
  priceLabel: string;
  priceIsZero: boolean;
  currencyCode: string;
  unit: string;
  quantityUnit: string;
  /** Minimum order in the pricing unit; defaults to 1 only for the quantity stepper floor. */
  minOrder: number;
  minimumOrderLabel: string;
  /** Available quantity, or null when unknown. */
  available: number | null;
  availableLabel: string;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  overview: string | null;
  seller: {
    name: string | null;
    verified: boolean;
    location: string;
    type: string;
  };
  sellerCoords: { lng: number; lat: number } | null;
  sdsUrl: string | null;
  documents: Listing["documents"];
}

export function buildProductDetail(listing: Listing): ProductDetailModel {
  const specs: Array<{ label: string; value: string }> = [
    { label: "Category", value: listing.category },
    ...Object.entries(listing.specifications).map(([label, value]) => ({ label, value })),
    ...(listing.composition ? [{ label: "Composition", value: listing.composition }] : []),
    ...(listing.quality ? [{ label: "Quality", value: listing.quality }] : []),
    { label: "Feedstock state", value: listing.state },
    ...(listing.frequency ? [{ label: "Frequency", value: listing.frequency }] : []),
    ...(listing.availabilityFrom || listing.availabilityTo
      ? [{ label: "Availability window", value: [listing.availabilityFrom, listing.availabilityTo].filter(Boolean).join(" → ") }]
      : []),
    ...(listing.moqNum !== null ? [{ label: "Minimum Order Quantity (MOQ)", value: listing.moq }] : []),
    ...(listing.qtyNum !== null
      ? [{ label: "Available quantity", value: formatQuantityWithUnitName(listing.qtyNum, listing.quantityUnit) ?? "" }]
      : []),
    { label: "Carbon profile", value: listing.hasCarbonData ? `${listing.co2} per ${listing.quantityUnit}` : "Not provided by seller" },
    ...(listing.claims.length > 0 ? [{ label: "Sustainability claims", value: listing.claims.join(", ") }] : []),
    ...(listing.additionalSpecs ?? []).map((spec) => ({ label: spec.label, value: spec.value })),
    ...(listing.location ? [{ label: "Pickup location", value: listing.location }] : []),
  ].filter((spec) => spec.label.trim() && spec.value.trim());

  // Dedupe labels, keeping the first occurrence (specifications map wins).
  const seen = new Set<string>();
  const uniqueSpecs = specs.filter((spec) => {
    const key = spec.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    id: listing.id,
    title: listing.title,
    location: listing.location || "Location not provided",
    moq: listing.moq,
    co2: listing.co2,
    price: listing.priceNum,
    priceLabel: listing.price,
    priceIsZero: listing.priceIsZero,
    currencyCode: listing.currencyCode,
    unit: listing.unit,
    quantityUnit: listing.quantityUnit,
    minOrder: listing.moqNum !== null && listing.moqNum > 0 ? listing.moqNum : 1,
    minimumOrderLabel: listing.moqNum !== null ? listing.moq : "Not specified by seller",
    available: listing.qtyNum,
    availableLabel:
      listing.qtyNum !== null
        ? `${formatQuantityWithUnitName(listing.qtyNum, listing.quantityUnit)} available`
        : "Availability not specified",
    images: listing.images,
    specs: uniqueSpecs,
    overview: listing.description,
    seller: {
      name: listing.sellerCompanyName,
      verified: listing.sellerVerified,
      location: listing.location || "Location not provided",
      type: listing.category,
    },
    sellerCoords: listing.lng !== null && listing.lat !== null ? { lng: listing.lng, lat: listing.lat } : null,
    sdsUrl: listing.sdsUrl ?? null,
    documents: listing.documents,
  };
}
