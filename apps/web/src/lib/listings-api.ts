"use client";

import { apiFetch, BackendApiError } from "./backend-client";

/**
 * Client contract for backend listings.
 * Mirrors docs/ANA_LISTING_API_CONTRACT.md from the backend worktree.
 */

export type ListingStatusCode =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "closed";

export const SELLER_STATUS_CODES: ListingStatusCode[] = [
  "draft",
  "pending_review",
  "paused",
  "closed",
];

/**
 * Persisted quantity unit codes. Live listings use the plural aliases
 * `tons`, `tonnes` and `units`; the backend stores whichever code was saved
 * verbatim, so the UI must never relabel an existing value.
 */
export type QuantityUnitCode = "ton" | "tons" | "tonne" | "tonnes" | "kg" | "lb" | "unit" | "units";
export const QUANTITY_UNIT_CODES: QuantityUnitCode[] = [
  "ton",
  "tons",
  "tonne",
  "tonnes",
  "kg",
  "lb",
  "unit",
  "units",
];

/**
 * Response code for certifications is `certification`; uploads accept either spelling.
 * `tds` (Technical Data Sheet) and `coa` (Certificate of Analysis) are optional
 * technical attachments buyers can download from the product page.
 */
export type ListingDocumentTypeCode = "photo" | "sds" | "certification" | "tds" | "coa";
/** Every code the backend can return, including ones this UI does not upload. */
export type AnyListingDocumentTypeCode = ListingDocumentTypeCode | "lab_report" | "other";

export function normalizeDocumentTypeCode(code: string | null | undefined): ListingDocumentTypeCode | string {
  if (code === "certificate") return "certification";
  return code ?? "other";
}

export interface ListingSpecifications {
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
  sameAsCompany?: boolean | null;
  claims?: string[] | null;
  additionalSpecs?: Array<{ label: string; value: string }> | null;
}

/** Location as returned with a listing; every field is null on a teaser. */
export interface ListingLocation {
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
}

export interface ListingDocument {
  id: number;
  listingId: number;
  documentTypeCode: ListingDocumentTypeCode | string;
  fileName: string;
  contentType?: string | null;
  byteLength?: number | null;
  sha256?: string | null;
  /** Relative backend path, for example `/api/listing-documents/12/download`. */
  fileUrl: string;
  verificationStatusCode?: string | null;
  createdAt?: string | null;
}

/**
 * Listing as projected for the requesting viewer (backend `listingForViewer`).
 * Members and admins get every field; anonymous visitors and users without an
 * active company get a teaser: `teaser` true, seller identity, exact location,
 * MOQ, price, specifications and documents withheld, quantity rounded.
 */
export interface BackendListing {
  id: number;
  slug: string;
  /** True when licensed fields were redacted for this viewer. */
  teaser?: boolean;
  sellerCompanyId: number | null;
  sellerCompanyName: string | null;
  sellerVerificationStatusCode?: string | null;
  sellerVerified?: boolean | null;
  locationId: number | null;
  locationCity?: string | null;
  locationStateProvince?: string | null;
  locationCountryCode?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  location: ListingLocation | null;
  title: string;
  materialTypeCode: string;
  quantity: number | null;
  quantityUnit: string | null;
  minimumOrderQuantity: number | null;
  pricePerUnit: number | null;
  currencyCode: string | null;
  listingStatusCode: ListingStatusCode | string;
  carbonIntensityKgCo2e: number | null;
  description: string | null;
  specifications: ListingSpecifications | null;
  documents: ListingDocument[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ListingWriteBody {
  sellerCompanyId?: number;
  locationId?: number;
  title?: string;
  materialTypeCode?: string;
  quantity?: number | null;
  quantityUnit?: string | null;
  minimumOrderQuantity?: number | null;
  pricePerUnit?: number | null;
  currencyCode?: string | null;
  listingStatusCode?: ListingStatusCode;
  carbonIntensityKgCo2e?: number | null;
  description?: string | null;
  specifications?: ListingSpecifications;
}

export interface CompanyLocation {
  id: number;
  companyId: number;
  locationTypeCode: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export type ListingScope = "public" | "owned";

function scopeQuery(scope: ListingScope, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  if (scope === "owned") params.set("scope", "owned");
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Canonical route id for navigation: numeric id when known, slug otherwise. */
export function listingRouteId(listing: Pick<BackendListing, "id" | "slug">) {
  return String(listing.id ?? listing.slug);
}

export async function fetchListings(
  scope: ListingScope,
  options: { search?: string; sellerCompanyId?: number } = {},
) {
  const response = await apiFetch<{ ok: true; listings: BackendListing[] }>(
    `/api/listings${scopeQuery(scope, {
      search: options.search,
      sellerCompanyId: options.sellerCompanyId
        ? String(options.sellerCompanyId)
        : undefined,
    })}`,
    { method: "GET" },
  );
  return response.listings ?? [];
}

/**
 * Fetch one listing by canonical id or slug.
 * Returns `null` only for an explicit 404; other failures throw.
 */
export async function fetchListing(idOrSlug: string, scope: ListingScope) {
  try {
    const response = await apiFetch<{ ok: true; listing: BackendListing }>(
      `/api/listings/${encodeURIComponent(idOrSlug)}${scopeQuery(scope)}`,
      { method: "GET" },
    );
    return response.listing ?? null;
  } catch (error) {
    if (error instanceof BackendApiError && error.kind === "not-found") {
      return null;
    }
    throw error;
  }
}

export async function createListing(body: ListingWriteBody) {
  const response = await apiFetch<{ ok: true; listing: BackendListing }>(
    "/api/listings",
    { method: "POST", body: JSON.stringify(body) },
  );
  return response.listing;
}

export async function updateListing(id: number, body: ListingWriteBody) {
  const response = await apiFetch<{ ok: true; listing: BackendListing }>(
    `/api/listings/${id}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return response.listing;
}

export async function closeListing(id: number) {
  const response = await apiFetch<{ ok: true; listing: BackendListing }>(
    `/api/listings/${id}`,
    { method: "DELETE" },
  );
  return response.listing;
}

export async function fetchListingDocuments(listingId: number, scope: ListingScope) {
  const response = await apiFetch<{ ok: true; documents: ListingDocument[] }>(
    `/api/listing-documents${scopeQuery(scope, { listingId: String(listingId) })}`,
    { method: "GET" },
  );
  return response.documents ?? [];
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_ACCEPT: Record<ListingDocumentTypeCode, string> = {
  photo: "image/png,image/jpeg,image/webp",
  sds: "application/pdf",
  certification: "application/pdf",
  tds: "application/pdf",
  coa: "application/pdf",
};

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadListingDocument({
  listingId,
  documentTypeCode,
  file,
}: {
  listingId: number;
  documentTypeCode: ListingDocumentTypeCode;
  file: File;
}) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new BackendApiError(
      `${file.name} is larger than 5 MB. Please upload a smaller file.`,
      413,
      "validation",
    );
  }
  const contentBase64 = await readFileAsBase64(file);
  const response = await apiFetch<{ ok: true; document: ListingDocument }>(
    "/api/listing-documents",
    {
      method: "POST",
      deadlineMs: 60_000,
      body: JSON.stringify({
        listingId,
        documentTypeCode,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64,
      }),
    },
  );
  return {
    ...response.document,
    documentTypeCode: normalizeDocumentTypeCode(response.document.documentTypeCode),
  };
}

export async function deleteListingDocument(id: number) {
  await apiFetch<{ ok: true }>(`/api/listing-documents/${id}`, {
    method: "DELETE",
  });
}

/**
 * Browser URL for a listing document. Relative API paths go through the
 * same-origin proxy; retained legacy absolute URLs (older blob references
 * without stored content) are used as-is.
 */
export function documentDownloadUrl(document: Pick<ListingDocument, "fileUrl" | "id">) {
  const fileUrl = document.fileUrl?.trim() ?? "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith("/api/backend/")) return fileUrl;
  const path = fileUrl.startsWith("/") ? fileUrl : `/api/listing-documents/${document.id}/download`;
  return `/api/backend${path}`;
}

/** Facilities for the active company (contract: authenticated GET /api/locations). */
export async function fetchCompanyLocations(companyId?: number) {
  const query = companyId ? `?companyId=${encodeURIComponent(String(companyId))}` : "";
  const response = await apiFetch<{ ok: true; locations: CompanyLocation[] }>(
    `/api/locations${query}`,
    { method: "GET" },
  );
  return response.locations ?? [];
}

export async function createCompanyLocation(
  companyId: number,
  body: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince?: string;
    postalCode?: string;
    countryCode: string;
    latitude?: number;
    longitude?: number;
    locationTypeCode?: string;
  },
) {
  const response = await apiFetch<{ ok: true; location: CompanyLocation }>(
    "/api/locations",
    { method: "POST", body: JSON.stringify({ companyId, ...body }) },
  );
  return response.location;
}

export interface LookupOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export async function fetchLookups() {
  const response = await apiFetch<{
    ok: true;
    lookups: Record<string, LookupOption[]>;
  }>("/api/lookups", { method: "GET" });
  return response.lookups ?? {};
}
