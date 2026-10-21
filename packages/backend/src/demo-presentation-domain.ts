import type { DemoPresentation } from "../../shared/src/demo-presentations-api.js";
import { ApiError } from "./http.js";

function invalid(): never {
  throw new ApiError(400, "Invalid reviewed demo presentation plan.");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, fields: string[]) {
  if (Object.keys(value).length !== fields.length || fields.some(key => !(key in value))) invalid();
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function code(value: unknown, max = 40): string | null {
  if (value === null) return null;
  const result = text(value, max);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(result)) invalid();
  return result;
}
function amount(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 999999999999999 || Math.abs(value * 1000 - Math.round(value * 1000)) > 0.01) invalid();
  return value;
}
function positiveId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483647) invalid();
  return value;
}
export function parseDemoPresentation(value: unknown): DemoPresentation {
  const row = object(value);
  exact(row, ["id", "kind", "companyName", "title", "materialTypeCode", "quantity", "quantityUnitCode", "price", "currencyCode", "priceUnitCode", "priceEstimated", "quantityEstimated"]);
  const id = text(row.id, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id)) invalid();
  if (row.kind !== "seller" && row.kind !== "buyer") invalid();
  if (typeof row.priceEstimated !== "boolean" || typeof row.quantityEstimated !== "boolean") invalid();
  const quantity = amount(row.quantity), price = amount(row.price);
  const quantityUnitCode = code(row.quantityUnitCode), priceUnitCode = code(row.priceUnitCode);
  const currencyCode = code(row.currencyCode, 3);
  const materialTypeCode = code(row.materialTypeCode, 80);
  if (!materialTypeCode || (currencyCode !== null && !/^[A-Z]{3}$/u.test(currencyCode))) invalid();
  if ((quantity !== null && !quantityUnitCode) || (price !== null && (!currencyCode || !priceUnitCode))) invalid();
  return { id, kind: row.kind, companyName: text(row.companyName, 240), title: text(row.title, 240), materialTypeCode, quantity, quantityUnitCode, price, currencyCode, priceUnitCode, priceEstimated: row.priceEstimated, quantityEstimated: row.quantityEstimated };
}

export type DemoPresentationEnrollment =
  | { sourceListingId: number; presentation: DemoPresentation & { kind: "seller" } }
  | { sourceWantedListingId: number; presentation: DemoPresentation & { kind: "buyer" } };
export function parseDemoPresentationPlan(value: unknown) {
  const plan = object(value);
  exact(plan, ["approvedByUserId", "entries"]);
  const approvedByUserId = positiveId(plan.approvedByUserId);
  if (!Array.isArray(plan.entries) || !plan.entries.length || plan.entries.length > 500) invalid();
  const ids = new Set<string>(), sources = new Set<string>();
  const entries: DemoPresentationEnrollment[] = plan.entries.map(value => {
    const entry = object(value), presentation = parseDemoPresentation(entry.presentation);
    const field = presentation.kind === "seller" ? "sourceListingId" : "sourceWantedListingId";
    exact(entry, [field, "presentation"]);
    const source = positiveId(entry[field]), key = `${presentation.kind}:${source}`;
    if (ids.has(presentation.id) || sources.has(key)) invalid();
    ids.add(presentation.id); sources.add(key);
    return presentation.kind === "seller"
      ? { sourceListingId: source, presentation: { ...presentation, kind: "seller" } }
      : { sourceWantedListingId: source, presentation: { ...presentation, kind: "buyer" } };
  });
  return { approvedByUserId, entries };
}
