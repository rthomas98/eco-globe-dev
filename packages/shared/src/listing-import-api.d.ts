export interface ListingImportListing {
  title: string | null;
  materialTypeCode: string | null;
  materialTypeLabel: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  minimumOrderQuantity: number | null;
  pricePerUnit: number | null;
  currencyCode: string | null;
  locationId: number | null;
  locationName: string | null;
  description: string | null;
  carbonIntensityKgCo2e: number | null;
  availabilityFrom: string | null;
  availabilityTo: string | null;
}
export interface ListingImportDiagnostic {
  field: string | null;
  severity: "error" | "warning";
  message: string;
}
export interface ListingImportRow {
  rowNumber: number;
  status: "ready" | "warning" | "error";
  listing: ListingImportListing;
  diagnostics: ListingImportDiagnostic[];
}
export interface ListingImportResult {
  importId: string;
  sellerCompanyId: number;
  committedAt: string;
  created: Array<{
    rowNumber: number;
    listingId: number;
    slug: string;
    title: string;
  }>;
}
export interface ListingImportPreview {
  previewId: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  fileSha256: string;
  createdAt: string;
  expiresAt: string;
  committed: boolean;
  result: ListingImportResult | null;
  counts: { total: number; ready: number; warning: number; error: number };
  rows: ListingImportRow[];
}
export interface ListingImportCommitRequest {
  idempotencyKey: string;
}
