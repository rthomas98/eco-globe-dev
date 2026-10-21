/**
 * Where the carbon calculator returns to. The destination is derived only from
 * the listing the calculator was opened for — never from an arbitrary URL or
 * browser history.
 */
export type CalculatorReturnTo = "detail" | "public-browse" | "buyer-browse";

export type CalculatorOrigin =
  /** Opened from the listing detail page: close the overlay to keep its state. */
  | { kind: "close"; label: string }
  /** Opened from a Browse card: go to that card's listing detail page. */
  | { kind: "link"; label: string; href: string };

export function calculatorOrigin(
  listing: { id: string; title: string } | null | undefined,
  returnTo: CalculatorReturnTo = "detail",
): CalculatorOrigin | null {
  if (!listing?.id) return null;
  const label = `Back to ${listing.title.trim() || "listing"}`;
  const id = encodeURIComponent(listing.id);
  switch (returnTo) {
    case "public-browse":
      return { kind: "link", label, href: `/browse/${id}` };
    case "buyer-browse":
      return { kind: "link", label, href: `/buyer/browse/${id}` };
    default:
      return { kind: "close", label };
  }
}
