import { createHash } from "node:crypto";
import type { DemoNumber, DemoPrice, DemoVolume, DemoGeography, DemoPlaylistResponse, DemoPlaylistSlug } from "../../shared/src/demo-playlists-api.js";
import type { DemoPlaylistPlan, DemoPlaylistSource } from "./demo-playlist-publishing.js";
import { ApiError } from "./http.js";

export function invalid(): never { throw new ApiError(400, "Invalid reviewed playlist plan."); }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
export function exact(row: Record<string, unknown>, keys: string[]) {
  if (Object.keys(row).length !== keys.length || keys.some(k => !(k in row))) invalid();
}
export function text(value: unknown, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function publicText(value: unknown, max = 500): string {
  const result = text(value, max);
  if (/(?:https?:|www\.|mailto:|\S+@\S+\.[a-z]{2,})/iu.test(result)) invalid();
  return result;
}
function nullable(value: unknown, max = 500): string | null { return value === null ? null : publicText(value, max); }
export function uuid(value: unknown): string {
  const id = text(value, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(id)) invalid();
  return id;
}
export function positiveId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483647) invalid();
  return value;
}
function numeric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 999999999999999) invalid();
  return value;
}
function member<const T extends string>(value: unknown, choices: readonly T[]): T {
  for (const choice of choices) if (choice === value) return choice;
  return invalid();
}
export function slug(value: unknown): DemoPlaylistSlug { return member(value, ["fuel-lsu", "all"]); }
export function array(value: unknown, max = 5000): unknown[] { if (!Array.isArray(value) || value.length > max) invalid(); return value; }
function code(value: unknown, max = 80): string { const result = publicText(value, max); if (!/^[A-Za-z0-9][A-Za-z0-9_/-]*$/u.test(result)) invalid(); return result; }
function numberValue(value: unknown): DemoNumber {
  const row = object(value);
  switch (row.kind) {
    case "scalar": exact(row, ["kind", "value"]); return { kind: "scalar", value: numeric(row.value) };
    case "range": {
      exact(row, ["kind", "min", "max"]); const min = numeric(row.min), max = numeric(row.max);
      if (min > max) invalid(); return { kind: "range", min, max };
    }
    case "text": exact(row, ["kind", "text"]); return { kind: "text", text: publicText(row.text, 240) };
    default: return invalid();
  }
}
function bounds(amount: DemoNumber): [number, number] | null {
  return amount.kind === "scalar" ? [amount.value, amount.value] : amount.kind === "range" ? [amount.min, amount.max] : null;
}
function price(value: unknown): DemoPrice {
  const row = object(value);
  if (row.kind === "missing") { exact(row, ["kind"]); return { kind: "missing" }; }
  exact(row, ["kind", "amount", "currencyCode", "perUnit", "direction", "basis"]);
  if (row.kind !== "value") invalid();
  const amount = numberValue(row.amount), direction = member(row.direction, ["buyer_pays", "seller_pays_gate_fee"]);
  const range = bounds(amount);
  if (range && (direction === "buyer_pays" ? range[0] < 0 : range[1] >= 0)) invalid();
  const currencyCode = code(row.currencyCode, 3); if (!/^[A-Z]{3}$/u.test(currencyCode)) invalid();
  return { kind: "value", amount, currencyCode, perUnit: publicText(row.perUnit, 80), direction, basis: member(row.basis, ["source", "source_estimate", "demo_estimate"]) };
}
function volume(value: unknown): DemoVolume {
  const row = object(value);
  if (row.kind === "missing") { exact(row, ["kind"]); return { kind: "missing" }; }
  exact(row, ["kind", "amount", "unit", "period", "basis"]); if (row.kind !== "value") invalid();
  const amount = numberValue(row.amount), range = bounds(amount); if (range && range[0] < 0) invalid();
  return { kind: "value", amount, unit: publicText(row.unit, 80), period: member(row.period, ["annual", "monthly", "daily", "scenario", "unspecified"]), basis: member(row.basis, ["source", "source_estimate", "demo_estimate"]) };
}
export function parseDemoGeography(value: unknown): DemoGeography {
  const row = object(value);
  if (row.kind === "pending") { exact(row, ["kind", "reason"]); return { kind: "pending", reason: member(row.reason, ["missing_location", "missing_country", "conflicting_address", "unreviewed", "unresolved"]) }; }
  exact(row, ["kind", "latitude", "longitude", "precision", "purpose", "label", "countryCode", "postalCode"]);
  if (row.kind !== "point") invalid();
  const latitude = numeric(row.latitude), longitude = numeric(row.longitude);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) invalid();
  const countryCode = code(row.countryCode, 2); if (!/^[A-Z]{2}$/u.test(countryCode)) invalid();
  const postalCode = nullable(row.postalCode, 40), precision = member(row.precision, ["reviewed_address", "postal_area"]);
  if (precision === "postal_area" && !postalCode) invalid();
  return { kind: "point", latitude, longitude, precision, purpose: member(row.purpose, ["facility", "headquarters", "office", "unknown"]), label: publicText(row.label, 240), countryCode, postalCode };
}
export function parseDemoPlaylist(value: unknown): DemoPlaylistResponse {
  const row = object(value); exact(row, ["ok", "playlist", "companies", "materials", "relationships", "counts"]); if (row.ok !== true) invalid();
  const playlist = object(row.playlist); exact(playlist, ["slug", "name"]);
  const companyIds = new Set<string>(), ids = new Set<string>();
  function unique(value: unknown): string { const id = uuid(value); if (ids.has(id)) invalid(); ids.add(id); return id; }
  const companies = array(row.companies).map(value => {
    const c = object(value); exact(c, ["id", "name", "description", "membership", "materialState", "geography"]);
    const id = unique(c.id); companyIds.add(id);
    return { id, name: publicText(c.name, 240), description: nullable(c.description, 4000), membership: member(c.membership, ["primary", "related"]), materialState: member(c.materialState, ["available", "no_material_data"]), geography: parseDemoGeography(c.geography) };
  });
  const materials = array(row.materials).map(value => {
    const m = object(value); exact(m, ["id", "companyId", "kind", "title", "materialTypeCode", "sourceStatus", "qualifier", "equivalents", "price", "volume", "geography"]);
    const companyId = uuid(m.companyId); if (!companyIds.has(companyId)) invalid();
    return { id: unique(m.id), companyId, kind: member(m.kind, ["seller", "buyer"]), title: publicText(m.title, 500), materialTypeCode: code(m.materialTypeCode), sourceStatus: member(m.sourceStatus, ["confirmed_stream", "identified_stream", "estimate", "prospect", "buyer_need", "unconfirmed"]), qualifier: nullable(m.qualifier, 1000), equivalents: array(m.equivalents, 100).map(v => publicText(v, 240)), price: price(m.price), volume: volume(m.volume), geography: parseDemoGeography(m.geography) };
  });
  const relationships = array(row.relationships).map(value => {
    const r = object(value); exact(r, ["id", "fromCompanyId", "target", "kind", "material", "materialTypeCode"]);
    const fromCompanyId = uuid(r.fromCompanyId); if (!companies.some(c => c.id === fromCompanyId && c.membership === "primary")) invalid();
    const t = object(r.target);
    let target: DemoPlaylistResponse["relationships"][number]["target"];
    if (t.kind === "company") { exact(t, ["kind", "companyId"]); const companyId = uuid(t.companyId); if (!companyIds.has(companyId)) invalid(); target = { kind: "company", companyId }; }
    else { exact(t, ["kind", "label"]); if (t.kind !== "group") invalid(); target = { kind: "group", label: publicText(t.label, 240) }; }
    return { id: unique(r.id), fromCompanyId, target, kind: member(r.kind, ["potential_buyer", "potential_provider", "potential_synergy", "similar_generator"]), material: publicText(r.material, 500), materialTypeCode: r.materialTypeCode === null ? null : code(r.materialTypeCode) };
  });
  const mapped = materials.filter(m => m.geography.kind === "point").length;
  const counts = { companies: companies.length, materials: materials.length, mapped, pending: materials.length - mapped };
  const supplied = object(row.counts); exact(supplied, ["companies", "materials", "mapped", "pending"]);
  if (Object.entries(counts).some(([key, value]) => supplied[key] !== value)) invalid();
  for (const c of companies) if ((c.materialState === "available") !== materials.some(m => m.companyId === c.id)) invalid();
  return { ok: true, playlist: { slug: slug(playlist.slug), name: publicText(playlist.name, 240) }, companies, materials, relationships, counts };
}

/** Canonical JSON binds every private and public reviewed field, regardless of key insertion order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const row = object(value);
  return "{" + Object.keys(row).sort().map(k => JSON.stringify(k) + ":" + canonical(row[k])).join(",") + "}";
}
export function digest(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
export function parseDemoPlaylistPlan(value: unknown): DemoPlaylistPlan {
  const row = object(value); exact(row, ["approvedByUserId", "intakeId", "sourceHashes", "detail", "sources", "profileProvenance", "relationshipProvenance", "reason"]);
  const detail = parseDemoPlaylist(row.detail), sourceIds = new Set<string>(), entryIds = new Set<string>();
  const sources: DemoPlaylistSource[] = array(row.sources).map(value => {
    const s = object(value); exact(s, ["entryId", "kind", "id", "provenance", ...("expectedVersion" in s ? ["expectedVersion"] : [])]);
    const entryId = uuid(s.entryId), kind = member(s.kind, ["listing", "wanted", "market_record"]), id = positiveId(s.id);
    const material = detail.materials.find(m => m.id === entryId);
    if (!material || entryIds.has(entryId) || sourceIds.has(`${kind}:${id}`) || (kind === "listing" && material.kind !== "seller") || (kind === "wanted" && material.kind !== "buyer")) invalid();
    entryIds.add(entryId); sourceIds.add(`${kind}:${id}`);
    const provenance = object(s.provenance); if (!Object.keys(provenance).length) invalid();
    const expectedVersion = s.expectedVersion === undefined ? undefined : text(s.expectedVersion, 64).toLowerCase();
    if (expectedVersion && !/^(?:[a-f0-9]{16}|[a-f0-9]{64})$/u.test(expectedVersion)) invalid();
    return { entryId, kind, id, provenance, ...(expectedVersion ? { expectedVersion } : {}) };
  });
  if (entryIds.size !== detail.materials.length) invalid();
  const sourceHashes = array(row.sourceHashes, 100).map(v => { const hash = text(v, 64).toLowerCase(); if (!/^[a-f0-9]{64}$/u.test(hash)) invalid(); return hash; });
  if (!sourceHashes.length) invalid();
  const plan = { approvedByUserId: positiveId(row.approvedByUserId), intakeId: text(row.intakeId, 240), sourceHashes, detail, sources, profileProvenance: object(row.profileProvenance), relationshipProvenance: object(row.relationshipProvenance), reason: text(row.reason, 1000) };
  if (!Object.keys(plan.profileProvenance).length || (detail.relationships.length && !Object.keys(plan.relationshipProvenance).length) || canonical(plan).length > 8000000) invalid();
  return plan;
}
