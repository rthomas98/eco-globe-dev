"use client";

import { apiFetch } from "./backend-client";

/** Seller responses (quotes) to a buyer's wanted listing / request for quote. */
export interface RfqResponse {
  id: number;
  listingId: number;
  listingTitle: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  quantity: number;
  quantityUnit: string;
  unitPrice: number;
  currencyCode: string;
  deliveryTerms: string | null;
  expiresAt: string | null;
  quoteStatusCode: string;
  createdAt: string;
}

export async function fetchRfqResponses(wantedListingId: number) {
  const body = await apiFetch<{ ok: true; responses: RfqResponse[] }>(
    `/api/wanted-listings/${wantedListingId}/responses`,
  );
  return Array.isArray(body.responses) ? body.responses : [];
}

export async function submitRfqResponse(
  wantedListingId: number,
  input: { listingId: number; quantity: number; unitPrice: number; deliveryTerms?: string; expiresAt?: string },
) {
  return apiFetch<{ ok: true; quote: { id: number } }>(`/api/wanted-listings/${wantedListingId}/responses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setQuoteStatus(quoteId: number, quoteStatusCode: "accepted" | "declined") {
  return apiFetch<{ ok: true }>(`/api/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify({ quoteStatusCode }),
  });
}
