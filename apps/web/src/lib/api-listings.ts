"use client";

/**
 * Aggregate buyer-interest signals for the seller's analytics.
 *
 * Listing data itself is read through `lib/listings-api.ts` / `lib/use-listings.ts`
 * (persisted backend records only); this module keeps the fire-and-forget
 * interest events that the seller listings page aggregates.
 */
export type ListingInterestEventType = "view" | "detail_view" | "cart_add" | "quote_request";

/** Fire-and-forget interest signal for the seller's aggregate analytics. Viewer identity is never shown. */
export function recordListingInterest(
  listingId: number | undefined | null,
  eventType: ListingInterestEventType,
) {
  if (!listingId) return;
  void fetch(`/api/backend/api/listings/${listingId}/interest`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType }),
  }).catch(() => {
    // Interest analytics are best-effort.
  });
}
