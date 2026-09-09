/** Canonical persisted listing contract. API validates all writes at its boundary. */
export type ListingStatusCode =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "closed";
/**
 * Quantity unit codes as persisted. Live data already uses the plural
 * aliases `tons`, `tonnes` and `units`; the API stores whichever code the
 * seller saved verbatim and never relabels an existing listing.
 */
export type ListingQuantityUnit =
  | "ton"
  | "tons"
  | "tonne"
  | "tonnes"
  | "kg"
  | "lb"
  | "unit"
  | "units";
export type ListingSpecifications = {
  category?: string | null;
  material?: string | null;
  listingType?: string | null;
  grade?: string | null;
  color?: string | null;
  shelfLife?: string | null;
  storage?: string | null;
  packaging?: string | null;
  weight?: string | null;
  usage?: string | null;
  origin?: string | null;
  quality?: string | null;
  composition?: string | null;
  frequency?: string | null;
  state?: string | null;
  availabilityFrom?: string | null;
  availabilityTo?: string | null;
  sustainabilityNotes?: string | null;
  originLocation?: string | null;
  sameAsCompany?: boolean;
  claims?: string[];
  additionalSpecs?: { label: string; value: string }[];
};
export type ListingWrite = {
  sellerCompanyId: number;
  locationId: number;
  title: string;
  materialTypeCode: string;
  quantity?: number | null;
  quantityUnit?: ListingQuantityUnit | "";
  minimumOrderQuantity?: number | null;
  pricePerUnit?: number | null;
  currencyCode?: string;
  listingStatusCode?: ListingStatusCode;
  carbonIntensityKgCo2e?: number | null;
  description?: string | null;
  specifications?: ListingSpecifications;
};
/** Persisted attachment types. `certificate` is accepted on upload and stored as `certification`. */
export type ListingDocumentTypeCode =
  | "photo"
  | "sds"
  | "certification"
  | "tds"
  | "coa"
  | "lab_report"
  | "other";
export type ListingDocument = {
  id: number;
  listingId: number;
  documentTypeCode: ListingDocumentTypeCode;
  fileName: string;
  /** Null for legacy URL-only references that were never stored inline. */
  contentType: string | null;
  byteLength: number | null;
  sha256: string | null;
  /**
   * Relative API path (`/api/listing-documents/:id/download`) for stored
   * content, or the retained legacy absolute URL for older blob references.
   */
  fileUrl: string;
  verificationStatusCode: string;
};
/** Location as returned with a listing; every field is null on a teaser. */
export type PersistedListingLocation = {
  id: number | null;
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
};
/**
 * Listing as projected for the requesting viewer (backend `listingForViewer`).
 *
 * Company members and admins receive every field. Anonymous visitors and
 * signed-in users without an active company receive a teaser: `teaser` is
 * true, the seller identity, exact location, MOQ, price, specifications and
 * documents are withheld (null / empty), `quantity` is rounded to one
 * significant figure and `description` is truncated to 140 characters.
 */
export type PersistedListing = {
  id: number;
  slug: string;
  /** True when licensed fields were redacted for this viewer. */
  teaser?: boolean;
  sellerCompanyId: number | null;
  sellerCompanyName: string | null;
  sellerVerificationStatusCode: string;
  sellerVerified: boolean;
  locationId: number | null;
  /** Flat location summary (region-level fields survive the teaser). */
  locationCity?: string | null;
  locationStateProvince?: string | null;
  locationCountryCode?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  title: string;
  materialTypeCode: string;
  quantity: number | null;
  quantityUnit: ListingQuantityUnit | "";
  minimumOrderQuantity: number | null;
  pricePerUnit: number | null;
  currencyCode: string;
  listingStatusCode: ListingStatusCode;
  carbonIntensityKgCo2e: number | null;
  description: string | null;
  specifications: ListingSpecifications;
  documents: ListingDocument[];
  location: PersistedListingLocation;
};
/** Single-request upload: `POST /api/listing-documents` stores the bytes inline. */
export type ListingUpload = {
  listingId: number;
  documentTypeCode: ListingDocumentTypeCode | "certificate";
  fileName: string;
  contentType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
  contentBase64: string;
};
