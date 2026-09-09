"use client";

import { apiFetch } from "./backend-client";

/**
 * Client for laboratory testing referrals.
 * Types come from the backend-owned `@eco-globe/shared` (`lab-api.ts`,
 * docs/LAB_API_CONTRACT_2026-09-09.md). A referral is not a booking: no
 * price, laboratory, accreditation, or turnaround duration is promised here.
 */

import type {
  LabAdminRequest,
  LabConfig,
  LabOptionalTest,
  LabPanel,
  LabPanelWrite,
  LabReport,
  LabReportWrite,
  LabRequest,
  LabRequestStatus,
  LabRequestWrite,
  LabResult,
  LabReview,
  LabSharing,
  LabTurnaround,
} from "@eco-globe/shared";

export type {
  LabAdminRequest,
  LabConfig,
  LabOptionalTest,
  LabPanel,
  LabPanelWrite,
  LabReport,
  LabReportWrite,
  LabRequest,
  LabRequestStatus,
  LabRequestWrite,
  LabResult,
  LabReview,
  LabSharing,
  LabTurnaround,
};

export const LAB_TURNAROUND_CODES: LabTurnaround[] = ["standard", "expedited", "not_urgent"];
export const LAB_REQUEST_STATUSES: LabRequestStatus[] = [
  "requested",
  "reviewing",
  "awaiting_sample",
  "testing",
  "completed",
  "cancelled",
];
export type LabGroupCode = LabOptionalTest["group"];
export const LAB_GROUP_CODES: LabGroupCode[] = ["processing", "safety", "compliance", "consistency"];
export type LabPanelStatus = LabPanel["status"];

export type LabPanelWithReview = LabPanel & { review: LabReview | null };
export type LabAssignee = { userId: number; name: string };

/** Report PDFs: at most 5 MiB decoded (contract). */
export const MAX_LAB_REPORT_BYTES = 5 * 1024 * 1024;
export const MAX_LAB_RESULTS = 4;

const noStore = { cache: "no-store" as const };

export async function fetchLabConfig(listingId: number) {
  const response = await apiFetch<{ ok: true; config: LabConfig }>(
    `/api/lab/config?listingId=${encodeURIComponent(String(listingId))}`,
    { method: "GET", ...noStore },
  );
  return response.config;
}

/** Create a referral. The same idempotency key never creates a second record. */
export async function createLabRequest(body: LabRequestWrite) {
  const response = await apiFetch<{ ok: true; request: LabRequest }>("/api/lab/requests", {
    method: "POST",
    body: JSON.stringify(body),
    ...noStore,
  });
  return response.request;
}

export async function fetchLabRequests(options: { listingId?: number } = {}) {
  const query = options.listingId ? `?listingId=${encodeURIComponent(String(options.listingId))}` : "";
  const response = await apiFetch<{ ok: true; requests: LabRequest[] }>(`/api/lab/requests${query}`, {
    method: "GET",
    ...noStore,
  });
  return response.requests ?? [];
}

/** Requester-side consent change; revocation removes seller/public access at once. */
export async function updateLabSharing(id: number, sharing: LabSharing) {
  const response = await apiFetch<{ ok: true; request: LabRequest }>(`/api/lab/requests/${id}/sharing`, {
    method: "PATCH",
    body: JSON.stringify({ sharing }),
    ...noStore,
  });
  return response.request;
}

export async function fetchLabReportsForListing(listingId: number) {
  const response = await apiFetch<{ ok: true; reports: LabReport[] }>(`/api/listings/${listingId}/lab-reports`, {
    method: "GET",
    ...noStore,
  });
  return response.reports ?? [];
}

/** Browser URL for a report through the same-origin proxy (authorization enforced upstream). */
export function labReportDownloadUrl(report: Pick<LabReport, "fileUrl" | "id">) {
  const path = report.fileUrl?.startsWith("/") ? report.fileUrl : `/api/lab/reports/${report.id}/file`;
  return `/api/backend${path}`;
}

// Internal admin

export async function fetchAdminLabRequests(status?: LabRequestStatus | "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiFetch<{ ok: true; requests: LabAdminRequest[] }>(`/api/admin/lab/requests${query}`, {
    method: "GET",
    ...noStore,
  });
  return response.requests ?? [];
}

export type LabAdminPatch = { status?: LabRequestStatus; ownerUserId?: number | null; notes?: string };

export async function updateAdminLabRequest(id: number, patch: LabAdminPatch) {
  const response = await apiFetch<{ ok: true; request: LabAdminRequest }>(`/api/admin/lab/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    ...noStore,
  });
  return response.request;
}

export async function fetchLabAssignees() {
  const response = await apiFetch<{ ok: true; assignees: LabAssignee[] }>("/api/admin/lab/assignees", {
    method: "GET",
    ...noStore,
  });
  return response.assignees ?? [];
}

export async function fetchLabPanels() {
  const response = await apiFetch<{ ok: true; panels: LabPanelWithReview[] }>("/api/admin/lab/panels", {
    method: "GET",
    ...noStore,
  });
  return response.panels ?? [];
}

/** Every save appends an immutable new version for the family. */
export async function saveLabPanel(body: LabPanelWrite) {
  const response = await apiFetch<{ ok: true; panel: LabPanelWithReview }>("/api/admin/lab/panels", {
    method: "POST",
    body: JSON.stringify(body),
    ...noStore,
  });
  return response.panel;
}

export async function createLabReport(requestId: number, body: LabReportWrite) {
  const response = await apiFetch<{ ok: true; report: LabReport }>(`/api/admin/lab/requests/${requestId}/reports`, {
    method: "POST",
    deadlineMs: 60_000,
    body: JSON.stringify(body),
    ...noStore,
  });
  return response.report;
}

export async function setLabReportPublished(id: number, published: boolean) {
  const response = await apiFetch<{ ok: true; report: LabReport }>(`/api/admin/lab/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ published }),
    ...noStore,
  });
  return response.report;
}

/** Read the first bytes of a file to confirm the PDF signature before upload. */
export async function isRealPdf(file: File): Promise<boolean> {
  if (file.size < 5) return false;
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}
