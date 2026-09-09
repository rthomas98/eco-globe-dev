/** Canonical persisted listing contract. API validates all writes at its boundary. */
export type ListingStatusCode =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "closed";
export type ListingQuantityUnit = "ton" | "tonne" | "kg" | "lb" | "unit";
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
export type ListingDocument = {
  id: number;
  listingId: number;
  documentTypeCode: "photo" | "sds" | "certification";
  fileName: string;
  contentType: string;
  byteLength: number;
  sha256: string;
  fileUrl: string;
  verificationStatusCode: string;
};
export type PersistedListing = {
  id: number;
  slug: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  sellerVerificationStatusCode: string;
  sellerVerified: boolean;
  locationId: number;
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
  location: {
    id: number;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string;
    latitude: number | null;
    longitude: number | null;
  };
};
export type ListingUpload = {
  listingId: number;
  documentTypeCode: "photo" | "sds" | "certificate" | "certification";
  fileName: string;
  contentType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
  contentBase64: string;
};
