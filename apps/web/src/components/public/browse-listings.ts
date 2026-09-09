/**
 * Marketplace listing view model shared by browse, detail, favorites, map
 * and carbon-calculator surfaces.
 *
 * Instances are built from backend records via `toListing` in
 * `@/lib/listing-view`. There is no static dataset: every consumer reads
 * persisted listings through the backend API.
 */

export type Frequency =
  | "One-time"
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Bimonthly"
  | "Twice a year"
  | "Quarterly"
  | "Yearly";

export const FREQUENCY_OPTIONS: Frequency[] = [
  "One-time",
  "Weekly",
  "Biweekly",
  "Monthly",
  "Bimonthly",
  "Twice a year",
  "Quarterly",
  "Yearly",
];

export type ListingState = "Solid" | "Liquid" | "Gas";

export interface ListingSpec {
  label: string;
  value: string;
}

export interface ListingDocumentRef {
  id: number;
  typeCode: string;
  fileName: string;
  /** Same-origin proxy URL for download. */
  url: string;
  contentType?: string | null;
  byteLength?: number | null;
  verificationStatusCode?: string | null;
}

export interface Listing {
  /** Canonical backend id as a string, used in routes. */
  id: string;
  backendId: number;
  slug: string;
  title: string;
  /** "City, Region" derived from the persisted location; empty when unknown. */
  location: string;
  /** Distance is resolved against the viewer at render time; "—" when unknown. */
  distance: string;
  /** Formatted MOQ with explicit unit, or "—" when not recorded. */
  moq: string;
  moqNum: number | null;
  /** Formatted carbon intensity or "—". */
  co2: string;
  co2Num: number | null;
  hasCarbonData: boolean;
  /** Formatted price label, or "Price unavailable" when not recorded. */
  price: string;
  priceNum: number | null;
  /** True when the seller recorded a price of exactly zero. */
  priceIsZero: boolean;
  currencyCode: string;
  /** "/t", "/kg", "/unit"… */
  unit: string;
  quantityUnit: string;
  qtyNum: number | null;
  /** Primary photo URL, or null when the seller has not uploaded one. */
  image: string | null;
  images: string[];
  tags: string[];
  lng: number | null;
  lat: number | null;
  category: string;
  materialTypeCode: string;
  grade: string | null;
  state: ListingState;
  quality?: string;
  composition?: string;
  availabilityFrom?: string;
  availabilityTo?: string;
  frequency: Frequency | null;
  additionalSpecs?: ListingSpec[];
  sdsUrl?: string;
  sdsDocument?: ListingDocumentRef;
  documents: ListingDocumentRef[];
  sellerCompanyId: number;
  sellerCompanyName: string | null;
  sellerVerified: boolean;
  sellerLocationId: number | null;
  statusCode: string;
  description: string | null;
  claims: string[];
  sustainabilityNotes?: string;
  specifications: Record<string, string>;
}

/** Listings with coordinates can be pinned on a map. */
export function hasCoordinates(
  listing: Listing,
): listing is Listing & { lng: number; lat: number } {
  return typeof listing.lng === "number" && typeof listing.lat === "number";
}
