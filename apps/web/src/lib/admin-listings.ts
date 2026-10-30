/**
 * Pure helpers for the admin listings table: status filter, search, the SDS
 * indicator and which lifecycle actions a row offers. Closing is the backend's
 * soft delete (status `closed`, order history kept); reopening moves a closed
 * listing back to draft.
 */

import { matchesListingSearch, type ListingSearchField } from "./listing-search";

export type AdminListingStatusFilter = "all" | "draft" | "pending_review" | "published" | "paused" | "closed";

export const ADMIN_LISTING_STATUS_FILTERS: Array<{ value: AdminListingStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending review" },
  { value: "published", label: "Published" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

export interface AdminListingRowSource {
  id: number;
  title: string;
  sellerCompanyName?: string | null;
  listingStatusCode: string;
  documents?: Array<{ documentTypeCode?: unknown }> | null;
}

export function listingStatusLabel(code: string): string {
  const known = ADMIN_LISTING_STATUS_FILTERS.find((f) => f.value === code && f.value !== "all");
  if (known) return known.label;
  const words = code.replace(/_/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "Unknown";
}

export function listingStatusTone(code: string): "green" | "amber" | "red" | "neutral" {
  if (code === "published") return "green";
  if (code === "pending_review" || code === "paused") return "amber";
  if (code === "closed") return "red";
  return "neutral";
}

export function listingHasSds(listing: Pick<AdminListingRowSource, "documents">): boolean {
  return Array.isArray(listing.documents) && listing.documents.some((d) => d?.documentTypeCode === "sds");
}

/** "LS-12", "ls12" or "12" match listing 12 exactly, whichever search field is chosen. */
function matchesListingId(id: number, query: string): boolean {
  const m = /^(?:ls-?)?(\d+)$/i.exec(query.trim());
  return m ? Number(m[1]) === id : false;
}

export function filterAdminListings<T extends AdminListingRowSource>(
  listings: readonly T[],
  { status, search, searchIn }: { status: AdminListingStatusFilter; search: string; searchIn: ListingSearchField },
): T[] {
  return listings.filter(
    (l) =>
      (status === "all" || l.listingStatusCode === status) &&
      (matchesListingId(l.id, search) || matchesListingSearch(l, search, searchIn)),
  );
}

export function countByStatus(listings: readonly Pick<AdminListingRowSource, "listingStatusCode">[]) {
  const counts: Record<string, number> = {};
  for (const l of listings) counts[l.listingStatusCode] = (counts[l.listingStatusCode] ?? 0) + 1;
  return counts;
}

/** Closed listings can only be reopened (to draft); every other status can be closed. */
export function adminListingActions(status: string): { canClose: boolean; canReopen: boolean } {
  return { canClose: status !== "closed", canReopen: status === "closed" };
}

/** Admin URLs may carry the listing as "LS-12"; the API takes the number. */
export function adminListingKey(id: string): string {
  return /^LS-\d+$/i.test(id) ? id.slice(3) : id;
}

export const CLOSE_LISTING_EXPLANATION =
  "Closing removes the listing from the marketplace so no new orders can be placed. Existing orders, payments and documents are kept, and you can reopen it as a draft later.";
