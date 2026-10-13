import { quantityUnitsMatch } from "./quantity-units";

export interface QuoteCandidateListing {
  id: number;
  listingStatusCode: string;
  materialTypeCode: string;
  quantityUnit: string | null;
  documents: { documentTypeCode: string }[] | null;
}

export interface QuoteListingOption<T extends QuoteCandidateListing> {
  listing: T;
  /** Null when the listing can be quoted; otherwise why it cannot. */
  blockedReason: string | null;
}

/**
 * Seller listings that match a buyer request, each marked quotable or not.
 * Matching uses the backend unit rule; a matching listing without a saved SDS
 * is shown but cannot be quoted, the same rule that blocks buying it.
 */
export function rfqQuoteListingOptions<T extends QuoteCandidateListing>(
  owned: T[],
  wanted: { materialTypeCode: string; quantityUnit: string | null },
): QuoteListingOption<T>[] {
  return owned
    .filter(
      (l) =>
        l.listingStatusCode === "published" &&
        l.materialTypeCode === wanted.materialTypeCode &&
        quantityUnitsMatch(l.quantityUnit, wanted.quantityUnit),
    )
    .map((listing) => ({
      listing,
      blockedReason: (listing.documents ?? []).some((d) => d.documentTypeCode === "sds")
        ? null
        : "No Safety Data Sheet (SDS) is saved on this listing. Upload the SDS before quoting.",
    }));
}
