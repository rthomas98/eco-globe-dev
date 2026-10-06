/**
 * Unit equivalence for matching saved quantities (RFQ responses, quotes).
 * Only spellings that are certainly the same unit are aliased: unit/units
 * and tonne/tonnes/t. Every other code is compared exactly; "ton"/"tons"
 * may mean short or metric tons and are never treated as metric tonnes.
 */
export function canonicalQuantityUnit(code: string | null | undefined): string {
  const key = (code ?? "").trim().toLowerCase();
  if (key === "unit" || key === "units") return "unit";
  if (key === "tonne" || key === "tonnes" || key === "t") return "tonne";
  return key;
}

/** True when two saved unit codes certainly name the same unit. */
export function quantityUnitsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = canonicalQuantityUnit(a);
  return left !== "" && left === canonicalQuantityUnit(b);
}

export interface QuoteListingGuard {
  minimumOrderQuantity: number | null;
  quantity: number | null;
}

/**
 * Client-side check mirroring the backend quote guard: the quoted quantity
 * must be positive and within the listing's saved MOQ and available stock.
 * Returns an error message, or null when acceptable.
 */
export function quoteQuantityError(quantity: number, listing: QuoteListingGuard, unitLabel: string): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "Enter a positive quantity.";
  if (Math.round(quantity * 1000) / 1000 !== quantity) return "Use at most three decimal places for the quantity.";
  const minimum = Number(listing.minimumOrderQuantity ?? 0);
  if (minimum > 0 && quantity < minimum) return `This listing's minimum order is ${minimum} ${unitLabel}.`;
  if (listing.quantity === null || listing.quantity === undefined) return "This listing has no available quantity recorded.";
  if (quantity > Number(listing.quantity)) return `Only ${listing.quantity} ${unitLabel} is available on this listing.`;
  return null;
}
