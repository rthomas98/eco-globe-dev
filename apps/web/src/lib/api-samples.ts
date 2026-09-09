"use client";

import { apiFetch } from "./backend-client";

/**
 * Pre-purchase sample requests: small lab test batches buyers order before
 * committing to a bulk order. Ported from the live sample workflow
 * (revision 01a0e593) and routed through the typed backend client so the
 * shape matches `GET/POST /api/sample-requests` there.
 */

export type SampleRequestStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "shipped"
  | "received";

export interface ApiSampleRequest {
  id: number;
  listingId: number;
  listingTitle: string;
  listingSlug: string;
  buyerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  quantityLb: number;
  note: string | null;
  deliveryAddress: string | null;
  status: SampleRequestStatus;
  sellerResponse: string | null;
  trackingNumber: string | null;
  convertedOrderId: number | null;
  createdAt: string;
  updatedAt: string;
}

export const SAMPLE_QUANTITY_OPTIONS_LB = [5, 10, 25] as const;

/**
 * Pending sample-to-order conversion, parked while the buyer walks through
 * checkout. Set when they click "Order in bulk" on a received sample; the
 * checkout success handler links the placed order back to the sample.
 */
const CONVERSION_KEY = "ecoglobe.sampleConversion";

export function stashSampleConversion(sampleId: number, listingId: number) {
  try {
    sessionStorage.setItem(CONVERSION_KEY, JSON.stringify({ sampleId, listingId }));
  } catch {
    // sessionStorage may be unavailable; conversion linking is best-effort.
  }
}

export function takeSampleConversion(
  listingId: number,
): { sampleId: number } | null {
  try {
    const raw = sessionStorage.getItem(CONVERSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sampleId?: number; listingId?: number };
    if (parsed.listingId !== listingId || !parsed.sampleId) return null;
    sessionStorage.removeItem(CONVERSION_KEY);
    return { sampleId: parsed.sampleId };
  } catch {
    return null;
  }
}

/** Sample requests visible to the caller (their buys and their sales). */
export async function fetchSampleRequests(): Promise<ApiSampleRequest[]> {
  const body = await apiFetch<{ ok: true; samples: ApiSampleRequest[] }>(
    "/api/sample-requests",
    { method: "GET" },
  );
  return Array.isArray(body.samples) ? body.samples : [];
}

export async function createSampleRequest(input: {
  listingId: number;
  quantityLb: number;
  note?: string;
  deliveryAddress?: string;
  /** Reused across retries so an uncertain network result never duplicates the sample. */
  idempotencyKey: string;
}) {
  const body = await apiFetch<{ ok: true; sample: { id: number; listingId: number; status: string } }>(
    "/api/sample-requests",
    { method: "POST", body: JSON.stringify(input) },
  );
  return body.sample;
}

export async function updateSampleRequest(
  id: number,
  patch: {
    status?: Exclude<SampleRequestStatus, "requested">;
    sellerResponse?: string;
    trackingNumber?: string;
    /** Buyer/admin only: links a received sample to the bulk order it led to. */
    convertedOrderId?: number;
  },
) {
  const body = await apiFetch<{ ok: true; sample: { id: number; status: SampleRequestStatus } }>(
    `/api/sample-requests/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return body.sample;
}
