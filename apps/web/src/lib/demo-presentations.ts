/**
 * Public demo feedstock presentations (GET /api/demo-presentations).
 *
 * These are reviewed, presentation-only snapshots — never marketplace
 * listings, never purchasable and never linked to a source record. The parser
 * copies only the allowlisted public fields, so anything extra the server
 * might send can't reach the UI, and a malformed item is dropped rather than
 * guessed at.
 *
 * Kept free of path aliases and runtime imports so `node --test` can import
 * it. Wire types are owned by the backend in
 * @eco-globe/shared/demo-presentations-api.
 */

import type { DemoPresentation, DemoPresentationList } from "@eco-globe/shared/demo-presentations-api";

export type { DemoPresentation } from "@eco-globe/shared/demo-presentations-api";

export type DemoPresentationKind = DemoPresentation["kind"];

export type DemoPresentationKindFilter = DemoPresentationKind | "all";

export const DEMO_PRESENTATION_KIND_FILTERS: Array<{ value: DemoPresentationKindFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "seller", label: "Seller offers" },
  { value: "buyer", label: "Buyer needs" },
];

export const DEMO_PRESENTATIONS_HREF = "/demo-feedstocks";
export const DEMO_PRESENTATION_KIND_PARAM = "kind";
export const DEMO_PRESENTATION_COMPANY_PARAM = "company";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function code(value: unknown): string | null {
  return typeof value === "string" && CODE.test(value) ? value : null;
}

/** null stays null; anything else must be a finite non-negative number. */
function amount(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function optionalCode(value: unknown): string | null | undefined {
  if (value === null) return null;
  return code(value) ?? undefined;
}

export function parseDemoPresentation(value: unknown): DemoPresentation | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" && UUID.test(raw.id) ? raw.id : null;
  const kind = raw.kind === "seller" || raw.kind === "buyer" ? raw.kind : null;
  const companyName = text(raw.companyName);
  const title = text(raw.title);
  const materialTypeCode = code(raw.materialTypeCode);
  const quantity = amount(raw.quantity);
  const price = amount(raw.price);
  const quantityUnitCode = optionalCode(raw.quantityUnitCode);
  const currencyCode = optionalCode(raw.currencyCode);
  const priceUnitCode = optionalCode(raw.priceUnitCode);
  if (!id || !kind || !companyName || !title || !materialTypeCode) return null;
  if (quantity === undefined || price === undefined) return null;
  if (quantityUnitCode === undefined || currencyCode === undefined || priceUnitCode === undefined) return null;
  if (typeof raw.priceEstimated !== "boolean" || typeof raw.quantityEstimated !== "boolean") return null;
  return {
    id,
    kind,
    companyName,
    title,
    materialTypeCode,
    quantity,
    quantityUnitCode,
    price,
    currencyCode,
    priceUnitCode,
    priceEstimated: raw.priceEstimated,
    quantityEstimated: raw.quantityEstimated,
  };
}

/**
 * Reads `{ok: true, presentations: [...]}`. Anything else — no `ok: true`, or
 * no presentations array — is an error, never an empty list.
 */
export function parseDemoPresentationsResponse(body: unknown): DemoPresentation[] {
  const raw = body && typeof body === "object" ? (body as Partial<Record<keyof DemoPresentationList, unknown>>) : null;
  if (!raw || raw.ok !== true || !Array.isArray(raw.presentations))
    throw new Error("Demo feedstocks could not be read.");
  return raw.presentations.map(parseDemoPresentation).filter((item): item is DemoPresentation => item !== null);
}

export function parseKindFilter(value: string | null | undefined): DemoPresentationKindFilter {
  return value === "seller" || value === "buyer" ? value : "all";
}

/** Sorted, de-duplicated company names for the company filter. */
export function demoPresentationCompanies(items: DemoPresentation[]): string[] {
  return Array.from(new Set(items.map((item) => item.companyName))).sort((a, b) => a.localeCompare(b));
}

export function filterDemoPresentations(
  items: DemoPresentation[],
  filter: { kind: DemoPresentationKindFilter; company: string | null },
): DemoPresentation[] {
  return items.filter(
    (item) => (filter.kind === "all" || item.kind === filter.kind) && (!filter.company || item.companyName === filter.company),
  );
}

/** "used_cooking_oil" → "Used cooking oil". */
export function describeMaterialType(materialTypeCode: string): string {
  const words = materialTypeCode.replace(/[_.-]+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : materialTypeCode;
}

/** Query string (leading "?" when non-empty) with the kind/company filters applied. */
export function withDemoPresentationFilters(
  search: string,
  filter: { kind: DemoPresentationKindFilter; company: string | null },
): string {
  const params = new URLSearchParams(search);
  if (filter.kind === "all") params.delete(DEMO_PRESENTATION_KIND_PARAM);
  else params.set(DEMO_PRESENTATION_KIND_PARAM, filter.kind);
  if (filter.company) params.set(DEMO_PRESENTATION_COMPANY_PARAM, filter.company);
  else params.delete(DEMO_PRESENTATION_COMPANY_PARAM);
  const query = params.toString();
  return query ? `?${query}` : "";
}
