/**
 * Listing table search. Product search matches the listing title only, so a
 * query such as "tar" does not return every listing from a seller whose name
 * happens to contain it ("GulfStar"); seller search is a separate, explicit
 * choice.
 */

export type ListingSearchField = "product" | "seller";

export const LISTING_SEARCH_FIELDS: Array<{ value: ListingSearchField; label: string; inputLabel: string }> = [
  { value: "product", label: "Product title", inputLabel: "Search product titles" },
  { value: "seller", label: "Seller name", inputLabel: "Search seller names" },
];

export function matchesListingSearch(
  listing: { title: string; sellerCompanyName?: string | null },
  query: string,
  field: ListingSearchField = "product",
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = field === "seller" ? listing.sellerCompanyName ?? "" : listing.title;
  return text.toLowerCase().includes(q);
}
