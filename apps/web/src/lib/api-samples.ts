"use client";

/**
 * Pre-purchase sample requests: small lab test batches (5–10 lb) buyers
 * order before committing to bulk escrow.
 */

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
  status: "requested" | "accepted" | "declined" | "shipped" | "received";
  sellerResponse: string | null;
  trackingNumber: string | null;
  convertedOrderId: number | null;
  createdAt: string;
  updatedAt: string;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }
  return body;
}

/**
 * Pending sample-to-order conversion, parked while the buyer walks through
 * checkout. Set when they click "Order in bulk" on a received sample; the
 * checkout success handler links the placed order back to the sample.
 */
const CONVERSION_KEY = "ecoglobe.sampleConversion";

export function stashSampleConversion(sampleId: number, listingId: number) {
  try {
    sessionStorage.setItem(CONVERSION_KEY, JSON.stringify({ sampleId, listingId }));
  } catch {}
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
  const body = await requestJson<{ samples: ApiSampleRequest[] }>(
    "/sample-requests",
  );
  return Array.isArray(body.samples) ? body.samples : [];
}

export async function createSampleRequest(input: {
  listingId: number;
  quantityLb: number;
  note?: string;
  deliveryAddress?: string;
}) {
  return requestJson<{ sample: { id: number } }>("/sample-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSampleRequest(
  id: number,
  patch: {
    status?: "accepted" | "declined" | "shipped" | "received";
    sellerResponse?: string;
    trackingNumber?: string;
    convertedOrderId?: number;
  },
) {
  return requestJson(`/sample-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
