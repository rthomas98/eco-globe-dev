/**
 * Seller listing close/restore rules and list filtering.
 *
 * Closing uses the existing DELETE /api/listings/:id, which is a soft close:
 * the listing, its documents, orders and history stay on record. Restoring
 * returns a closed listing to draft through the existing PATCH, so the seller
 * must resubmit it for review before buyers can see it again.
 */

export type ListingLifecycleFilter = "active" | "closed" | "all";

export const LISTING_LIFECYCLE_FILTERS: Array<{ value: ListingLifecycleFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const CLOSABLE = new Set(["draft", "pending_review", "published", "paused"]);

/** Any known non-closed status can be closed by the seller. */
export function canCloseListing(statusCode: string | null | undefined): boolean {
  return !!statusCode && CLOSABLE.has(statusCode);
}

/** Only a closed listing offers "Restore to draft". */
export function canRestoreListing(statusCode: string | null | undefined): boolean {
  return statusCode === "closed";
}

export function isClosedListing(statusCode: string | null | undefined): boolean {
  return statusCode === "closed";
}

export function filterListingsByLifecycle<T extends { statusCode: string }>(
  listings: T[],
  filter: ListingLifecycleFilter,
): T[] {
  if (filter === "all") return listings;
  if (filter === "closed") return listings.filter((l) => isClosedListing(l.statusCode));
  return listings.filter((l) => !isClosedListing(l.statusCode));
}

export function countListingsByLifecycle(listings: Array<{ statusCode: string }>): Record<ListingLifecycleFilter, number> {
  const closed = listings.filter((l) => isClosedListing(l.statusCode)).length;
  return { active: listings.length - closed, closed, all: listings.length };
}

export const CLOSE_LISTING_CONFIRMATION =
  "Buyers will no longer see this listing and new orders cannot be placed on it. The listing, its documents, existing orders and history are kept. You can restore it to draft later and resubmit it for review.";

export const PENDING_REVIEW_NOTICE =
  "Submitted for review. EcoGlobe staff check pending listings in the admin moderation queue before publishing; buyers cannot see or order this listing until it is published. Check the status here — an email notification is not guaranteed.";

export const CLOSED_LISTING_NOTICE =
  "This listing is closed. It is hidden from buyers and kept on record with its documents, orders and history. Restore it to draft to edit and resubmit it for review.";
