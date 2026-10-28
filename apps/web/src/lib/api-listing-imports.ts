"use client";

import { apiFetch, apiFetchBlob } from "./backend-client";
import type { ListingImportCounts, ListingImportDiagnostic, ListingImportRowStatus } from "./listing-import-format";

/*
 * Spreadsheet listing import. The server parses the .xlsx into a preview bound
 * to this user and seller company; nothing is written until commit, which
 * creates every row as a draft listing in one transaction. Commit is
 * replay-safe: the same idempotency key returns the stored result.
 */

export interface ListingImportRowListing {
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

export interface ListingImportPreviewRow {
  rowNumber: number;
  status: ListingImportRowStatus;
  listing: ListingImportRowListing;
  diagnostics: ListingImportDiagnostic[];
}

export interface ListingImportResult {
  importId: string;
  sellerCompanyId: number;
  committedAt: string;
  created: Array<{ rowNumber: number; listingId: number; slug: string; title: string }>;
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
  counts: ListingImportCounts;
  rows: ListingImportPreviewRow[];
}

const BASE = "/api/listing-imports";
const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const IMPORT_DEADLINE_MS = 60_000;

const company = (sellerCompanyId: number) => `sellerCompanyId=${encodeURIComponent(String(sellerCompanyId))}`;

export async function downloadListingImportTemplate(sellerCompanyId: number) {
  return apiFetchBlob(`${BASE}/template?${company(sellerCompanyId)}`, { deadlineMs: 30_000 });
}

export async function previewListingImport(sellerCompanyId: number, file: File) {
  return apiFetch<ListingImportPreview>(`${BASE}/preview?${company(sellerCompanyId)}`, {
    method: "POST",
    rawBody: true,
    headers: { "content-type": XLSX_CONTENT_TYPE },
    body: await file.arrayBuffer(),
    deadlineMs: IMPORT_DEADLINE_MS,
  });
}

export async function fetchListingImport(sellerCompanyId: number, previewId: string) {
  return apiFetch<ListingImportPreview>(`${BASE}/${encodeURIComponent(previewId)}?${company(sellerCompanyId)}`);
}

export async function commitListingImport(sellerCompanyId: number, previewId: string, idempotencyKey: string) {
  return apiFetch<ListingImportResult>(`${BASE}/${encodeURIComponent(previewId)}/commit?${company(sellerCompanyId)}`, {
    method: "POST",
    body: JSON.stringify({ idempotencyKey }),
    deadlineMs: IMPORT_DEADLINE_MS,
  });
}

/**
 * One idempotency key per preview, kept for the browser session so a retry
 * after a lost response replays the same commit instead of creating copies.
 */
export function importCommitKey(previewId: string): string {
  const storageKey = `ecoglobe.listing-import.commit.${previewId}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}
