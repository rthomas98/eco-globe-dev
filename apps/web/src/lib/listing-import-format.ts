/**
 * Pure helpers for the spreadsheet listing import (seller and admin).
 * Imported listings are created as drafts; each one then needs an SDS and the
 * fields checkout requires before it can be submitted or published. Kept free
 * of `@/` imports so `node --test` can load it directly.
 */

export type ListingImportRowStatus = "ready" | "warning" | "error";

export interface ListingImportCounts {
  total: number;
  ready: number;
  warning: number;
  error: number;
}

export interface ListingImportDiagnostic {
  field: string | null;
  severity: "error" | "warning";
  message: string;
}

export interface ListingImportRow {
  rowNumber: number;
  status: ListingImportRowStatus;
  diagnostics: ListingImportDiagnostic[];
}

export type ListingImportRowFilter = "all" | "error" | "warning";

/** Only importable when there is at least one row and no row has an error. */
export function canCommitImport(counts: ListingImportCounts): boolean {
  return counts.total > 0 && counts.error === 0;
}

export function filterImportRows<T extends Pick<ListingImportRow, "status">>(rows: readonly T[], filter: ListingImportRowFilter): T[] {
  return filter === "all" ? [...rows] : rows.filter((row) => row.status === filter);
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** One-line summary of a preview for the status banner. */
export function importSummary(counts: ListingImportCounts): string {
  if (counts.total === 0) return "The spreadsheet has no listing rows.";
  if (counts.error > 0)
    return `${plural(counts.error, "row")} ${counts.error === 1 ? "has" : "have"} errors. Fix ${counts.error === 1 ? "it" : "them"} in the spreadsheet and upload it again; nothing has been imported.`;
  const parts = [`${plural(counts.total, "listing")} ready to import as drafts`];
  if (counts.warning > 0) parts.push(`${plural(counts.warning, "row")} with warnings`);
  return `${parts.join(", ")}.`;
}

/** The live state of an imported listing, read back after the import. */
export interface ImportedListingState {
  listingStatusCode: string;
  hasSds: boolean;
  quantity: number | null;
  quantityUnit: string | null;
  minimumOrderQuantity: number | null;
  pricePerUnit: number | null;
  currencyCode: string | null;
  locationId: number | null;
}

export type ImportedListingNext =
  | "complete-details"
  | "add-sds"
  | "submit"
  | "submitted"
  | "published"
  | "other";

/** Fields the backend requires before a draft can be submitted (listing-routes `save`). */
export function missingSubmissionFields(listing: ImportedListingState): string[] {
  const missing: string[] = [];
  if (listing.quantity === null || listing.quantity <= 0) missing.push("quantity");
  if (!listing.quantityUnit) missing.push("unit");
  if (listing.minimumOrderQuantity === null || listing.minimumOrderQuantity <= 0) missing.push("minimum order");
  if (listing.pricePerUnit === null) missing.push("price");
  if (!listing.currencyCode) missing.push("currency");
  if (listing.locationId === null) missing.push("facility");
  return missing;
}

/** What the seller (or admin) still has to do for one imported listing. */
export function importedListingNext(listing: ImportedListingState): ImportedListingNext {
  if (listing.listingStatusCode === "pending_review") return "submitted";
  if (listing.listingStatusCode === "published") return "published";
  if (listing.listingStatusCode !== "draft") return "other";
  if (missingSubmissionFields(listing).length > 0) return "complete-details";
  if (!listing.hasSds) return "add-sds";
  return "submit";
}

export function importedNextLabel(next: ImportedListingNext, missing: readonly string[] = []): string {
  switch (next) {
    case "complete-details":
      return missing.length ? `Add ${missing.join(", ")}` : "Complete the listing details";
    case "add-sds":
      return "Upload an SDS PDF";
    case "submit":
      return "Ready to submit";
    case "submitted":
      return "Submitted for review";
    case "published":
      return "Published";
    default:
      return "No longer a draft";
  }
}

/** Counts for the follow-up banner after the import. */
export function importedProgress(states: readonly ImportedListingState[]) {
  const tally = { completeDetails: 0, addSds: 0, ready: 0, done: 0 };
  for (const state of states) {
    const next = importedListingNext(state);
    if (next === "complete-details") tally.completeDetails += 1;
    else if (next === "add-sds") tally.addSds += 1;
    else if (next === "submit") tally.ready += 1;
    else tally.done += 1;
  }
  return tally;
}

/** Client-side guard before uploading; the server enforces the same limits. */
export const LISTING_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const LISTING_IMPORT_MAX_ROWS = 500;

export function workbookFileProblem(file: { name: string; size: number }): string | null {
  if (!/\.xlsx$/i.test(file.name)) return "Choose an .xlsx spreadsheet. Save CSV or Numbers files as Excel (.xlsx) first.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > LISTING_IMPORT_MAX_BYTES) return "The spreadsheet is larger than 2 MB. Split it into smaller files.";
  return null;
}

/** Long-running import POSTs that the same-origin proxies give a longer deadline. */
const LISTING_IMPORT_WRITE_PATH =
  /^\/api\/listing-imports\/(?:preview|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/commit)$/i;

export function isListingImportWrite(pathname: string, method: string): boolean {
  return method === "POST" && LISTING_IMPORT_WRITE_PATH.test(pathname);
}

/** Lower-case words of a title or file name, without the extension and SDS wording. */
export function sdsMatchKey(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(sds|msds|safety data sheet)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SdsFileMatch {
  matches: Array<{ fileIndex: number; listingId: number }>;
  /** File indexes with no listing whose title matches the file name. */
  unmatched: number[];
  /** File indexes whose name matches more than one listing title. */
  ambiguous: number[];
}

/**
 * Pairs SDS PDFs with imported listings when the file name is the listing
 * title (ignoring case, punctuation, ".pdf" and "SDS"), e.g. "Biochar - SDS.pdf"
 * → "Biochar". Never guesses: ambiguous titles and second files for the same
 * listing are left for the per-row upload.
 */
export function matchSdsFiles(fileNames: readonly string[], listings: ReadonlyArray<{ id: number; title: string }>): SdsFileMatch {
  const byKey = new Map<string, number[]>();
  for (const listing of listings) {
    const key = sdsMatchKey(listing.title);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), listing.id]);
  }
  const result: SdsFileMatch = { matches: [], unmatched: [], ambiguous: [] };
  const taken = new Set<number>();
  fileNames.forEach((name, fileIndex) => {
    const ids = byKey.get(sdsMatchKey(name)) ?? [];
    if (ids.length === 0) result.unmatched.push(fileIndex);
    else if (ids.length > 1) result.ambiguous.push(fileIndex);
    else if (taken.has(ids[0]!)) result.unmatched.push(fileIndex);
    else {
      taken.add(ids[0]!);
      result.matches.push({ fileIndex, listingId: ids[0]! });
    }
  });
  return result;
}

/** Text inputs of the inline "complete details" form for one imported draft. */
export interface ImportedDetailsDraft {
  quantity: string;
  quantityUnit: string;
  minimumOrderQuantity: string;
  pricePerUnit: string;
  currencyCode: string;
  locationId: string;
}

export interface ImportedDetailsBody {
  quantity: number;
  quantityUnit: string;
  minimumOrderQuantity: number;
  pricePerUnit: number;
  currencyCode: string;
  locationId: number;
}

const DETAIL_UNITS = ["ton", "tons", "tonne", "tonnes", "kg", "lb", "unit", "units"];

function amount(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Pre-fills the form from the live listing; blanks stay blank. */
export function detailsDraftFrom(listing: ImportedListingState): ImportedDetailsDraft {
  return {
    quantity: listing.quantity === null ? "" : String(listing.quantity),
    quantityUnit: listing.quantityUnit ?? "tonnes",
    minimumOrderQuantity: listing.minimumOrderQuantity === null ? "" : String(listing.minimumOrderQuantity),
    pricePerUnit: listing.pricePerUnit === null ? "" : String(listing.pricePerUnit),
    currencyCode: listing.currencyCode ?? "USD",
    locationId: listing.locationId === null ? "" : String(listing.locationId),
  };
}

/**
 * Checks the form against the same rules the backend applies on submit
 * (positive quantity and minimum order, minimum ≤ quantity, a price, a
 * three-letter currency, a known unit and an owned facility).
 */
export function parseDetailsDraft(draft: ImportedDetailsDraft): { body: ImportedDetailsBody } | { error: string } {
  const quantity = amount(draft.quantity);
  const moq = amount(draft.minimumOrderQuantity);
  const price = amount(draft.pricePerUnit);
  const currency = draft.currencyCode.trim().toUpperCase();
  const locationId = Number(draft.locationId);
  if (quantity === null || quantity <= 0) return { error: "Enter a quantity greater than 0." };
  if (!DETAIL_UNITS.includes(draft.quantityUnit)) return { error: "Choose a unit." };
  if (moq === null || moq <= 0) return { error: "Enter a minimum order greater than 0." };
  if (moq > quantity) return { error: "The minimum order cannot be more than the quantity." };
  if (price === null) return { error: "Enter a price per unit." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Enter a three-letter currency code, such as USD." };
  if (!Number.isInteger(locationId) || locationId <= 0) return { error: "Choose a facility." };
  return { body: { quantity, quantityUnit: draft.quantityUnit, minimumOrderQuantity: moq, pricePerUnit: price, currencyCode: currency, locationId } };
}
