"use client";

import { apiFetch } from "./backend-client";
import {
  isPositiveListingId,
  parseSdsRequestGetBody,
  parseSdsRequestPostBody,
} from "./listing-sds-request";

function sdsRequestPath(listingId: number) {
  if (!isPositiveListingId(listingId)) throw new Error("This listing cannot receive SDS requests.");
  return `/api/listings/${listingId}/sds-request`;
}

/** The active buyer company's SDS request state for one listing. */
export async function fetchListingSdsRequest(listingId: number) {
  const body = await apiFetch<unknown>(sdsRequestPath(listingId), { method: "GET", cache: "no-store" });
  return parseSdsRequestGetBody(body, listingId);
}

/**
 * Records the request and the seller's in-app notification in one backend
 * transaction. Repeats return the existing request; 409 means an SDS exists.
 */
export async function requestListingSds(listingId: number) {
  const body = await apiFetch<unknown>(sdsRequestPath(listingId), {
    method: "POST",
    body: JSON.stringify({}),
  });
  return parseSdsRequestPostBody(body, listingId);
}
