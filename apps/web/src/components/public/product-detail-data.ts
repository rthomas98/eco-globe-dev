import type { Listing } from "./browse-listings";
import { describeUnit, formatQuantityWithUnitName } from "@/lib/listing-format";

/**
 * Presentation model for a persisted listing on the public and buyer detail
 * pages. Every value is derived from the saved record; nothing is invented.
 */
export interface ProductDetailModel {
  id: string;
  /** True when the backend withheld licensed fields for this viewer. */
  teaser: boolean;
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
  /** Saved facts shown under Overview when the seller wrote no description. */
  overviewFacts: Array<{ label: string; value: string }>;
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

/**
 * Facts for an empty Overview, taken only from saved listing fields. Values
 * the backend withholds for this viewer (MOQ on teasers) and values the view
 * model defaults when missing (feedstock state) are left out; nothing is
 * written as narrative.
 */
export function overviewFacts(listing: Listing): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  if (listing.category.trim()) facts.push({ label: "Category", value: listing.category });
  if (listing.qtyNum !== null) {
    const quantity = formatQuantityWithUnitName(listing.qtyNum, listing.quantityUnit);
    if (quantity) facts.push({ label: "Available", value: `${listing.teaser ? "Approx. " : ""}${quantity}` });
  }
  if (!listing.teaser && listing.moqNum !== null && listing.moq.trim())
    facts.push({ label: "Minimum order", value: listing.moq });
  if (listing.frequency) facts.push({ label: "Supply frequency", value: listing.frequency });
  if (listing.location.trim()) facts.push({ label: "Location", value: listing.location });
  return facts;
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
    { label: "Carbon profile", value: listing.hasCarbonData ? `${listing.co2} per ${describeUnit(listing.quantityUnit).singular}` : "Not provided by seller" },
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
    teaser: listing.teaser,
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
    minimumOrderLabel: listing.teaser
      ? listing.moq
      : listing.moqNum !== null
        ? listing.moq
        : "Not specified by seller",
    available: listing.qtyNum,
    availableLabel:
      listing.qtyNum !== null
        ? `${listing.teaser ? "Approx. " : ""}${formatQuantityWithUnitName(listing.qtyNum, listing.quantityUnit)} available`
        : "Availability not specified",
    images: listing.images,
    specs: uniqueSpecs,
    overview: listing.description,
    overviewFacts: listing.description?.trim() ? [] : overviewFacts(listing),
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
