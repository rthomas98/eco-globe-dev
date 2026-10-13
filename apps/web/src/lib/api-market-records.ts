"use client";

import type {
  MarketAuditList,
  MarketCommitRequest,
  MarketCommitResult,
  MarketPreview,
  MarketRecordInput,
  MarketRecordList,
  MarketRecordResponse,
  MarketRecordRole,
  MarketReviewStatus,
  MarketSourceType,
} from "@eco-globe/shared/market-records-api";
import { apiFetch, isBackendApiError } from "./backend-client";

/*
 * Internal market research records (admin only). These never feed public
 * browse, orders, checkout, maps, recommendations or reporting; nothing in
 * this module may be imported outside components/admin/market-records.
 * Wire types are owned by the backend in @eco-globe/shared/market-records-api.
 */

export type {
  MarketAuditEvent,
  MarketCommitResult,
  MarketDiagnostic,
  MarketPreview,
  MarketPreviewRow,
  MarketRecord,
  MarketRecordData,
  MarketRecordInput,
  MarketRecordRole,
  MarketReview,
  MarketReviewStatus,
  MarketSourceType,
} from "@eco-globe/shared/market-records-api";

export type MarketRecordStatusFilter = "active" | "archived" | "all";
export type MarketReviewField = "address" | "price" | "volume";

export interface MarketRecordListParams {
  role?: MarketRecordRole;
  status?: MarketRecordStatusFilter;
  search?: string;
  sourceRecordType?: MarketSourceType;
  sourceChecked?: "true" | "false";
  fieldStatus?: `${MarketReviewField}:${MarketReviewStatus}`;
  importBatchId?: string;
  cursor?: string;
  limit?: number;
}

/** PATCH body: only changed top-level keys; address/price/volume replace as whole groups. */
export type MarketRecordChanges = Partial<MarketRecordInput>;

const BASE = "/api/admin/market-records";

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function fetchMarketRecords(params: MarketRecordListParams = {}) {
  const body = await apiFetch<MarketRecordList>(`${BASE}${query({ ...params })}`);
  return {
    records: Array.isArray(body?.records) ? body.records : [],
    total: typeof body?.total === "number" ? body.total : 0,
    nextCursor: body?.nextCursor ?? null,
  };
}

export async function fetchMarketRecord(id: number) {
  const body = await apiFetch<MarketRecordResponse>(`${BASE}/${id}`);
  return body.record;
}

export async function fetchMarketRecordAudit(id: number, cursor?: string) {
  const body = await apiFetch<MarketAuditList>(`${BASE}/${id}/audit${query({ cursor })}`);
  return {
    events: Array.isArray(body?.events) ? body.events : [],
    nextCursor: body?.nextCursor ?? null,
  };
}

export async function createMarketRecord(input: MarketRecordInput) {
  const body = await apiFetch<MarketRecordResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.record;
}

export async function updateMarketRecord(
  id: number,
  expectedVersion: string,
  changes: MarketRecordChanges,
  reason: string,
) {
  const body = await apiFetch<MarketRecordResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ expectedVersion, reason, changes }),
  });
  return body.record;
}

/** Independent field review; the server records the reviewer and date. */
export async function reviewMarketRecordField(
  id: number,
  field: MarketReviewField,
  input: {
    expectedVersion: string;
    status: MarketReviewStatus;
    citation: string | null;
    reason: string;
  },
) {
  const body = await apiFetch<MarketRecordResponse>(`${BASE}/${id}/confirmations/${field}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.record;
}

export async function archiveMarketRecord(id: number, expectedVersion: string, reason: string) {
  const body = await apiFetch<MarketRecordResponse>(`${BASE}/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, reason }),
  });
  return body.record;
}

export async function restoreMarketRecord(id: number, expectedVersion: string, reason: string) {
  const body = await apiFetch<MarketRecordResponse>(`${BASE}/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, reason }),
  });
  return body.record;
}

/* ── Workbook import (server-parsed preview, explicit commit) ── */

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** Server limit on the compressed upload (below the hosted proxy's 4.5 MB request cap). */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export async function previewMarketRecordImport(file: File) {
  return apiFetch<MarketPreview>(`${BASE}/imports/preview`, {
    method: "POST",
    rawBody: true,
    headers: { "content-type": XLSX_CONTENT_TYPE },
    body: await file.arrayBuffer(),
    deadlineMs: 60_000,
  });
}

export async function fetchMarketRecordImport(previewId: string) {
  return apiFetch<MarketPreview>(`${BASE}/imports/${encodeURIComponent(previewId)}`);
}

export async function commitMarketRecordImport(previewId: string, input: MarketCommitRequest) {
  return apiFetch<MarketCommitResult>(
    `${BASE}/imports/${encodeURIComponent(previewId)}/commit`,
    { method: "POST", body: JSON.stringify(input), deadlineMs: 60_000 },
  );
}

/* ── Error details from route-local `{code, fieldErrors, diagnostics}` ── */

export interface MarketRecordErrorDetails {
  status: number | null;
  code: string | null;
  fieldErrors: Record<string, string>;
  existingId: number | null;
}

export function marketRecordErrorDetails(error: unknown): MarketRecordErrorDetails {
  const details: MarketRecordErrorDetails = {
    status: null,
    code: null,
    fieldErrors: {},
    existingId: null,
  };
  if (!isBackendApiError(error)) return details;
  details.status = error.status ?? null;
  const body = error.body && typeof error.body === "object" ? (error.body as Record<string, unknown>) : null;
  if (typeof body?.code === "string") details.code = body.code;
  if (typeof body?.existingId === "number") details.existingId = body.existingId;
  if (body?.fieldErrors && typeof body.fieldErrors === "object") {
    for (const [key, value] of Object.entries(body.fieldErrors as Record<string, unknown>)) {
      // The server also carries conflict metadata here; it is not a field message.
      if (key === "existingId" || key === "currentVersion") continue;
      if (typeof value === "string") details.fieldErrors[key] = value;
    }
  }
  return details;
}
