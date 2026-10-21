/**
 * Public demo playlists (GET /api/demo-playlists, GET /api/demo-playlists/:slug).
 *
 * Presentation-only company profiles, material examples and potential
 * relationships — never marketplace listings and never purchasable. The
 * parsers copy only the frozen allowlisted fields: an extra server field can't
 * reach the UI, a malformed row is dropped rather than guessed at, and a point
 * that fails validation becomes "location pending" instead of a guessed pin.
 * Counts are always derived from the parsed rows, never trusted from the wire.
 *
 * Kept free of path aliases and runtime imports so `node --test` can import
 * it; money/unit formatting is passed in by the caller. Wire types are a
 * frozen copy in ./demo-playlists-contract.
 */

import type {
  DemoGeography,
  DemoNumber,
  DemoPlaylistCompany,
  DemoPlaylistMaterial,
  DemoPlaylistRelationship,
  DemoPlaylistSlug,
  DemoPlaylistSummary,
  DemoPrice,
  DemoSourceStatus,
  DemoValueBasis,
  DemoVolume,
} from "./demo-playlists-contract";

export type {
  DemoGeography,
  DemoPlaylistCompany,
  DemoPlaylistMaterial,
  DemoPlaylistRelationship,
  DemoPlaylistSlug,
  DemoPlaylistSummary,
  DemoPrice,
  DemoVolume,
} from "./demo-playlists-contract";

/** FUEL/LSU opens first, then ALL — whatever order the server lists them in. */
export const DEMO_PLAYLIST_ORDER: readonly DemoPlaylistSlug[] = ["fuel-lsu", "all"];

export const DEMO_PLAYLIST_PARAM = "playlist";
export const DEMO_PLAYLIST_COMPANY_PARAM = "company";
export const DEMO_PLAYLIST_KIND_PARAM = "kind";
export const DEMO_PLAYLIST_QUERY_PARAM = "q";
export const DEMO_PLAYLIST_NETWORK_PARAM = "network";

export type DemoPlaylistKindFilter = DemoPlaylistMaterial["kind"] | "all";

export const DEMO_PLAYLIST_KIND_FILTERS: Array<{ value: DemoPlaylistKindFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "seller", label: "Seller offers" },
  { value: "buyer", label: "Buyer needs" },
];

export interface DemoPlaylistData {
  playlist: DemoPlaylistSummary;
  companies: DemoPlaylistCompany[];
  materials: DemoPlaylistMaterial[];
  relationships: DemoPlaylistRelationship[];
}

export interface DemoPlaylistFilter {
  /** Company id; null shows every company. */
  company: string | null;
  kind: DemoPlaylistKindFilter;
  query: string;
  /** Show potential relationships and related companies. Off by default. */
  network: boolean;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const CODE = /^[a-z0-9][a-z0-9_./-]{0,63}$/i;
const CURRENCY = /^[A-Z]{3}$/i;
const COUNTRY = /^[A-Z]{2}$/i;

type Raw = Record<string, unknown>;

function record(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  return text(value) ?? undefined;
}

function id(value: unknown): string | null {
  return typeof value === "string" && ID.test(value) ? value : null;
}

function code(value: unknown): string | null {
  return typeof value === "string" && CODE.test(value) ? value : null;
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const SLUGS = DEMO_PLAYLIST_ORDER;
const BASES = ["source", "source_estimate", "demo_estimate"] as const;
const PERIODS = ["annual", "monthly", "daily", "scenario", "unspecified"] as const;
const PENDING_REASONS = ["missing_location", "missing_country", "conflicting_address", "unreviewed", "unresolved"] as const;
const PRECISIONS = ["reviewed_address", "postal_area"] as const;
const PURPOSES = ["facility", "headquarters", "office", "unknown"] as const;
const SOURCE_STATUSES = ["confirmed_stream", "identified_stream", "estimate", "prospect", "buyer_need", "unconfirmed"] as const;
const RELATIONSHIP_KINDS = ["potential_buyer", "potential_provider", "potential_synergy", "similar_generator"] as const;

function parseSummary(value: unknown): DemoPlaylistSummary | null {
  const raw = record(value);
  const slug = oneOf(raw?.slug, SLUGS);
  const name = text(raw?.name);
  return slug && name ? { slug, name } : null;
}

function bySlugOrder(a: DemoPlaylistSummary, b: DemoPlaylistSummary) {
  return SLUGS.indexOf(a.slug) - SLUGS.indexOf(b.slug);
}

/** Reads `{ok: true, playlists: [...]}`; anything else is an error, never an empty list. */
export function parseDemoPlaylistList(body: unknown): DemoPlaylistSummary[] {
  const raw = record(body);
  if (!raw || raw.ok !== true || !Array.isArray(raw.playlists)) throw new Error("Demo playlists could not be read.");
  const seen = new Set<string>();
  return raw.playlists
    .map(parseSummary)
    .filter((item): item is DemoPlaylistSummary => {
      if (!item || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    })
    .sort(bySlugOrder);
}

function parseNumber(value: unknown): DemoNumber | null {
  const raw = record(value);
  if (!raw) return null;
  if (raw.kind === "scalar") return finite(raw.value) ? { kind: "scalar", value: raw.value } : null;
  if (raw.kind === "range")
    return finite(raw.min) && finite(raw.max) && raw.min <= raw.max ? { kind: "range", min: raw.min, max: raw.max } : null;
  if (raw.kind === "text") {
    const value = text(raw.text);
    return value ? { kind: "text", text: value } : null;
  }
  return null;
}

/** Zero, negative gate fees and ranges survive exactly as sent. */
export function parseDemoPrice(value: unknown): DemoPrice | null {
  const raw = record(value);
  if (raw?.kind === "missing") return { kind: "missing" };
  if (raw?.kind !== "value") return null;
  const amount = parseNumber(raw.amount);
  const currencyCode = typeof raw.currencyCode === "string" && CURRENCY.test(raw.currencyCode) ? raw.currencyCode.toUpperCase() : null;
  const perUnit = code(raw.perUnit);
  const direction = oneOf(raw.direction, ["buyer_pays", "seller_pays_gate_fee"] as const);
  const basis = oneOf(raw.basis, BASES);
  if (!amount || !currencyCode || !perUnit || !direction || !basis) return null;
  return { kind: "value", amount, currencyCode, perUnit, direction, basis };
}

export function parseDemoVolume(value: unknown): DemoVolume | null {
  const raw = record(value);
  if (raw?.kind === "missing") return { kind: "missing" };
  if (raw?.kind !== "value") return null;
  const amount = parseNumber(raw.amount);
  const unit = code(raw.unit);
  const period = oneOf(raw.period, PERIODS);
  const basis = oneOf(raw.basis, BASES);
  if (!amount || !unit || !period || !basis) return null;
  return { kind: "value", amount, unit, period, basis };
}

const UNRESOLVED: DemoGeography = { kind: "pending", reason: "unresolved" };

/**
 * A point must be a real coordinate with a label and country. Anything else —
 * including (0, 0), the classic failed-geocode default — is shown as pending,
 * never as a guessed pin.
 */
export function parseDemoGeography(value: unknown): DemoGeography {
  const raw = record(value);
  if (raw?.kind === "pending") {
    const reason = oneOf(raw.reason, PENDING_REASONS);
    return reason ? { kind: "pending", reason } : UNRESOLVED;
  }
  if (raw?.kind !== "point") return UNRESOLVED;
  const { latitude, longitude } = raw;
  if (!finite(latitude) || !finite(longitude)) return UNRESOLVED;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return UNRESOLVED;
  if (latitude === 0 && longitude === 0) return UNRESOLVED;
  const precision = oneOf(raw.precision, PRECISIONS);
  const purpose = oneOf(raw.purpose, PURPOSES);
  const label = text(raw.label);
  const countryCode = typeof raw.countryCode === "string" && COUNTRY.test(raw.countryCode) ? raw.countryCode.toUpperCase() : null;
  // Postal codes are kept verbatim: leading zeros and letters matter.
  const postalCode = raw.postalCode === null ? null : text(raw.postalCode);
  if (!precision || !purpose || !label || !countryCode) return UNRESOLVED;
  if (postalCode === null && raw.postalCode !== null) return UNRESOLVED;
  if (precision === "postal_area" && !postalCode) return UNRESOLVED;
  return { kind: "point", latitude, longitude, precision, purpose, label, countryCode, postalCode };
}

function parseCompany(value: unknown): DemoPlaylistCompany | null {
  const raw = record(value);
  if (!raw) return null;
  const companyId = id(raw.id);
  const name = text(raw.name);
  const description = optionalText(raw.description);
  const membership = oneOf(raw.membership, ["primary", "related"] as const);
  const materialState = oneOf(raw.materialState, ["available", "no_material_data"] as const);
  if (!companyId || !name || description === undefined || !membership || !materialState) return null;
  return { id: companyId, name, description, membership, materialState, geography: parseDemoGeography(raw.geography) };
}

function parseMaterial(value: unknown): DemoPlaylistMaterial | null {
  const raw = record(value);
  if (!raw) return null;
  const materialId = id(raw.id);
  const companyId = id(raw.companyId);
  const kind = oneOf(raw.kind, ["seller", "buyer"] as const);
  const title = text(raw.title);
  const materialTypeCode = code(raw.materialTypeCode);
  const sourceStatus = oneOf(raw.sourceStatus, SOURCE_STATUSES);
  const qualifier = optionalText(raw.qualifier);
  const price = parseDemoPrice(raw.price);
  const volume = parseDemoVolume(raw.volume);
  if (!materialId || !companyId || !kind || !title || !materialTypeCode || !sourceStatus) return null;
  if (qualifier === undefined || !price || !volume || !Array.isArray(raw.equivalents)) return null;
  const equivalents = raw.equivalents.map(text).filter((item): item is string => item !== null);
  return {
    id: materialId,
    companyId,
    kind,
    title,
    materialTypeCode,
    sourceStatus,
    qualifier,
    equivalents,
    price,
    volume,
    geography: parseDemoGeography(raw.geography),
  };
}

function parseRelationship(value: unknown): DemoPlaylistRelationship | null {
  const raw = record(value);
  if (!raw) return null;
  const relationshipId = id(raw.id);
  const fromCompanyId = id(raw.fromCompanyId);
  const kind = oneOf(raw.kind, RELATIONSHIP_KINDS);
  const material = text(raw.material);
  const materialTypeCode = raw.materialTypeCode === null ? null : code(raw.materialTypeCode);
  const target = record(raw.target);
  const targetCompanyId = target?.kind === "company" ? id(target.companyId) : null;
  const targetLabel = target?.kind === "group" ? text(target.label) : null;
  if (!relationshipId || !fromCompanyId || !kind || !material) return null;
  if (materialTypeCode === null && raw.materialTypeCode !== null) return null;
  if (!targetCompanyId && !targetLabel) return null;
  return {
    id: relationshipId,
    fromCompanyId,
    target: targetCompanyId ? { kind: "company", companyId: targetCompanyId } : { kind: "group", label: targetLabel! },
    kind,
    material,
    materialTypeCode,
  };
}

function uniqueById<T extends { id: string }>(items: Array<T | null>): T[] {
  const seen = new Set<string>();
  return items.filter((item): item is T => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Reads one playlist. The envelope must be `ok: true` for the requested slug;
 * rows that reference an unknown company (or a relationship whose source is not
 * a primary company) are dropped so nothing renders under the wrong name.
 */
export function parseDemoPlaylistResponse(body: unknown, expectedSlug: DemoPlaylistSlug): DemoPlaylistData {
  const raw = record(body);
  const playlist = parseSummary(raw?.playlist);
  if (
    !raw ||
    raw.ok !== true ||
    !playlist ||
    playlist.slug !== expectedSlug ||
    !Array.isArray(raw.companies) ||
    !Array.isArray(raw.materials) ||
    !Array.isArray(raw.relationships)
  )
    throw new Error("This demo playlist could not be read.");
  const companies = uniqueById(raw.companies.map(parseCompany));
  const byId = new Map(companies.map((company) => [company.id, company]));
  const materials = uniqueById(raw.materials.map(parseMaterial)).filter((item) => byId.has(item.companyId));
  const relationships = uniqueById(raw.relationships.map(parseRelationship)).filter(
    (item) =>
      byId.get(item.fromCompanyId)?.membership === "primary" &&
      (item.target.kind === "group" || byId.has(item.target.companyId)),
  );
  return { playlist, companies, materials, relationships };
}

// ── URL state ────────────────────────────────────────────────────────────────

/** Requested playlist when it exists, otherwise the first (FUEL) one. */
export function resolveDemoPlaylistSlug(
  param: string | null | undefined,
  playlists: DemoPlaylistSummary[],
): DemoPlaylistSlug | null {
  return playlists.find((item) => item.slug === param)?.slug ?? playlists[0]?.slug ?? null;
}

/** Suffix the legacy gallery appended to FUEL company names, e.g. "Encore CO2 (FUEL/LSU demo)". */
const LEGACY_COMPANY_SUFFIX = " (FUEL/LSU demo)";

/**
 * Company by id, or by exact name for links made before playlists existed —
 * including legacy names that carry the exact " (FUEL/LSU demo)" suffix.
 */
export function resolveDemoCompanyId(param: string | null | undefined, companies: DemoPlaylistCompany[]): string | null {
  if (!param) return null;
  const byName = (name: string) =>
    companies.find((company) => company.membership === "primary" && company.name === name)?.id;
  return (
    companies.find((company) => company.id === param)?.id ??
    byName(param) ??
    (param.endsWith(LEGACY_COMPANY_SUFFIX) ? byName(param.slice(0, -LEGACY_COMPANY_SUFFIX.length)) : undefined) ??
    null
  );
}

export function parseDemoKindFilter(value: string | null | undefined): DemoPlaylistKindFilter {
  return value === "seller" || value === "buyer" ? value : "all";
}

/**
 * Query string (leading "?" when non-empty) with the given params changed.
 * Empty/default values are removed so the default view has a clean URL.
 * Changing the playlist clears the company, whose ids are playlist-specific.
 */
export function withDemoPlaylistParams(
  search: string,
  patch: Partial<{ playlist: string | null } & DemoPlaylistFilter>,
): string {
  const params = new URLSearchParams(search);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  if ("playlist" in patch) {
    set(DEMO_PLAYLIST_PARAM, patch.playlist ?? null);
    if (!("company" in patch)) params.delete(DEMO_PLAYLIST_COMPANY_PARAM);
  }
  if ("company" in patch) set(DEMO_PLAYLIST_COMPANY_PARAM, patch.company ?? null);
  if ("kind" in patch) set(DEMO_PLAYLIST_KIND_PARAM, patch.kind && patch.kind !== "all" ? patch.kind : null);
  if ("query" in patch) set(DEMO_PLAYLIST_QUERY_PARAM, patch.query?.trim() || null);
  if ("network" in patch) set(DEMO_PLAYLIST_NETWORK_PARAM, patch.network ? "1" : null);
  const query = params.toString();
  return query ? `?${query}` : "";
}

// ── Filtering ────────────────────────────────────────────────────────────────

/** "used_cooking_oil" → "used cooking oil" (lower case, for searching). */
function materialTypeWords(materialTypeCode: string): string {
  return materialTypeCode.replace(/[_.\-/]+/g, " ").trim().toLowerCase();
}

/** Search-only folding: "CO₂" and "CO2" match each other. Displayed text is never changed. */
function searchText(value: string): string {
  return value.replace(/[₀-₉]/g, (digit) => String(digit.charCodeAt(0) - 0x2080)).toLowerCase();
}

function matchesQuery(query: string, ...values: Array<string | null | undefined>): boolean {
  const needle = searchText(query.trim());
  if (!needle) return true;
  return values.some((value) => !!value && searchText(value).includes(needle));
}

/** Materials matching every filter; this one set feeds both the list and the map. */
export function filterDemoMaterials(data: DemoPlaylistData, filter: DemoPlaylistFilter): DemoPlaylistMaterial[] {
  return data.materials.filter(
    (item) =>
      (filter.kind === "all" || item.kind === filter.kind) &&
      (!filter.company || item.companyId === filter.company) &&
      matchesQuery(filter.query, item.title, materialTypeWords(item.materialTypeCode), item.qualifier, ...item.equivalents),
  );
}

/** Primary company profiles (including those with no material data), sorted by name. */
export function primaryDemoCompanies(data: DemoPlaylistData): DemoPlaylistCompany[] {
  return data.companies
    .filter((company) => company.membership === "primary")
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Profiles shown for the current company filter. */
export function visibleDemoProfiles(data: DemoPlaylistData, filter: DemoPlaylistFilter): DemoPlaylistCompany[] {
  return primaryDemoCompanies(data).filter((company) => !filter.company || company.id === filter.company);
}

/** Potential relationships for the visible primary companies; empty while the network is hidden. */
export function visibleDemoRelationships(data: DemoPlaylistData, filter: DemoPlaylistFilter): DemoPlaylistRelationship[] {
  if (!filter.network) return [];
  const names = new Map(data.companies.map((company) => [company.id, company.name]));
  return data.relationships.filter((item) => {
    if (filter.company && item.fromCompanyId !== filter.company) return false;
    const target = item.target.kind === "company" ? names.get(item.target.companyId) : item.target.label;
    return matchesQuery(
      filter.query,
      item.material,
      item.materialTypeCode && materialTypeWords(item.materialTypeCode),
      target,
      names.get(item.fromCompanyId),
    );
  });
}

export interface DemoMaterialCounts {
  total: number;
  mapped: number;
  pending: number;
}

/** Mapped/pending counts cover material examples only, never profiles. */
export function countDemoMaterials(materials: DemoPlaylistMaterial[]): DemoMaterialCounts {
  const mapped = materials.filter((item) => item.geography.kind === "point").length;
  return { total: materials.length, mapped, pending: materials.length - mapped };
}

export function demoMaterialCountsByCompany(materials: DemoPlaylistMaterial[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of materials) counts.set(item.companyId, (counts.get(item.companyId) ?? 0) + 1);
  return counts;
}

// ── Map points ───────────────────────────────────────────────────────────────

export type DemoMapPointKind = "material" | "profile" | "network";

export interface DemoMapPoint {
  /** Unique across kinds, e.g. "material:<id>". */
  key: string;
  kind: DemoMapPointKind;
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  role: DemoPlaylistMaterial["kind"] | null;
  /** Value and location lines shown in the popup. */
  facts: DemoFact[];
}

export function demoMapPointKey(kind: DemoMapPointKind, id: string) {
  return `${kind}:${id}`;
}

/**
 * Pins for the map: every mapped visible material; profile pins for primary
 * companies without material data (only while no kind/search filter narrows
 * the view to materials); and relationship-target pins while the network is shown.
 * Company geography never stands in for a material's own location.
 */
export function buildDemoMapPoints(
  data: DemoPlaylistData,
  filter: DemoPlaylistFilter,
  materials: DemoPlaylistMaterial[],
  relationships: DemoPlaylistRelationship[],
  format: DemoValueFormatters,
): DemoMapPoint[] {
  const companies = new Map(data.companies.map((company) => [company.id, company]));
  const points: DemoMapPoint[] = [];
  for (const item of materials) {
    if (item.geography.kind !== "point") continue;
    points.push({
      key: demoMapPointKey("material", item.id),
      kind: "material",
      id: item.id,
      lat: item.geography.latitude,
      lng: item.geography.longitude,
      title: item.title,
      subtitle: companies.get(item.companyId)?.name ?? "",
      role: item.kind,
      facts: demoMaterialFacts(item, format),
    });
  }
  const pushCompany = (company: DemoPlaylistCompany, kind: "profile" | "network", subtitle: string) => {
    if (company.geography.kind !== "point") return;
    points.push({
      key: demoMapPointKey(kind, company.id),
      kind,
      id: company.id,
      lat: company.geography.latitude,
      lng: company.geography.longitude,
      title: company.name,
      subtitle,
      role: null,
      facts: [locationFact(company.geography)],
    });
  };
  if (filter.kind === "all" && !filter.query.trim()) {
    for (const company of visibleDemoProfiles(data, filter))
      if (company.materialState === "no_material_data") pushCompany(company, "profile", "Company profile · no material examples");
  }
  // One network pin per visible relationship target, primary or related, so
  // every "Show on map" in the relationship list has a matching pin.
  const targets = new Set<string>();
  for (const item of relationships) if (item.target.kind === "company") targets.add(item.target.companyId);
  for (const companyId of targets) {
    const company = companies.get(companyId);
    if (company) pushCompany(company, "network", "Potential relationship · not confirmed");
  }
  return points;
}

export interface DemoMapSite {
  key: string;
  lat: number;
  lng: number;
  points: DemoMapPoint[];
}

/** Points sharing (almost) the same coordinate become one site, so none hides under another. */
export function groupDemoMapSites(points: DemoMapPoint[]): DemoMapSite[] {
  const sites = new Map<string, DemoMapSite>();
  for (const point of points) {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    const site = sites.get(key);
    if (site) site.points.push(point);
    else sites.set(key, { key, lat: point.lat, lng: point.lng, points: [point] });
  }
  return Array.from(sites.values());
}

/**
 * Greedy screen-space clustering: sites closer than `radius` pixels to a
 * cluster's first site join it. `project` maps a site to pixels.
 */
export function clusterDemoMapSites(
  sites: DemoMapSite[],
  project: (site: DemoMapSite) => { x: number; y: number },
  radius: number,
): DemoMapSite[][] {
  const clusters: Array<{ x: number; y: number; sites: DemoMapSite[] }> = [];
  for (const site of sites) {
    const { x, y } = project(site);
    const near = clusters.find((cluster) => Math.hypot(cluster.x - x, cluster.y - y) < radius);
    if (near) near.sites.push(site);
    else clusters.push({ x, y, sites: [site] });
  }
  return clusters.map((cluster) => cluster.sites);
}

// ── Labels ───────────────────────────────────────────────────────────────────

export interface DemoValueFormatters {
  /** Absolute amount in its recorded currency, e.g. "$50.00". */
  money: (amount: number, currencyCode: string) => string;
  unit: (code: string) => { short: string; singular: string };
}

const SOURCE_STATUS_LABELS: Record<DemoSourceStatus, string> = {
  confirmed_stream: "Source-reported stream",
  identified_stream: "Identified stream",
  estimate: "Source estimate",
  prospect: "Prospect",
  buyer_need: "Stated buyer need",
  unconfirmed: "Unconfirmed",
};

/** A source assertion, never a verified badge. */
export function demoSourceStatusLabel(status: DemoSourceStatus): string {
  return SOURCE_STATUS_LABELS[status];
}

function formatAmount(amount: DemoNumber, format: (value: number) => string): string {
  if (amount.kind === "scalar") return format(amount.value);
  if (amount.kind === "range") return `${format(amount.min)}–${format(amount.max)}`;
  return amount.text;
}

/** A gate fee's size, ascending: a signed −60…−50 range reads 50–60. */
function magnitude(amount: DemoNumber): DemoNumber {
  if (amount.kind === "scalar") return { kind: "scalar", value: Math.abs(amount.value) };
  if (amount.kind === "text") return amount;
  const [min, max] = [Math.abs(amount.min), Math.abs(amount.max)].sort((a, b) => a - b) as [number, number];
  return { kind: "range", min, max };
}

/**
 * "$0.00 per gallon", "€80.00–€120.00 per metric tonne", or
 * "Seller pays a gate fee: $50.00 per metric tonne". A gate fee keeps its
 * direction in words; the sign is never shown as a negative price.
 */
export function demoPriceLabel(price: DemoPrice, format: DemoValueFormatters): string | null {
  if (price.kind === "missing") return null;
  const gateFee = price.direction === "seller_pays_gate_fee";
  const amount = formatAmount(gateFee ? magnitude(price.amount) : price.amount, (value) =>
    format.money(value, price.currencyCode),
  );
  const perUnit = price.amount.kind === "text" ? "" : ` per ${format.unit(price.perUnit).singular}`;
  return gateFee ? `Seller pays a gate fee: ${amount}${perUnit}` : `${amount}${perUnit}`;
}

const PERIOD_SUFFIX: Record<Extract<DemoVolume, { kind: "value" }>["period"], string> = {
  annual: " per year",
  monthly: " per month",
  daily: " per day",
  scenario: " (demo scenario)",
  unspecified: "",
};

const quantityNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/** "390,000 gal per year" — a volume is never described as available stock. */
export function demoVolumeLabel(volume: DemoVolume, format: Pick<DemoValueFormatters, "unit">): string | null {
  if (volume.kind === "missing") return null;
  if (volume.amount.kind === "text") return `${volume.amount.text}${PERIOD_SUFFIX[volume.period]}`;
  const unit = format.unit(volume.unit);
  const amount = formatAmount(volume.amount, (value) => quantityNumber.format(value));
  return `${amount} ${unit.short || unit.singular}${PERIOD_SUFFIX[volume.period]}`;
}

/** Field-specific estimate wording; null for plain source values. */
export function demoBasisLabel(field: "price" | "volume", basis: DemoValueBasis): string | null {
  if (basis === "demo_estimate") return field === "price" ? "Demo price estimate" : "Demo volume estimate";
  if (basis === "source_estimate") return field === "price" ? "Source price estimate" : "Source volume estimate";
  return null;
}

const PENDING_LABELS: Record<Extract<DemoGeography, { kind: "pending" }>["reason"], string> = {
  missing_location: "Location pending",
  missing_country: "Location pending — country not supplied",
  conflicting_address: "Location under review — conflicting source addresses",
  unreviewed: "Location pending review",
  unresolved: "Location pending — could not be resolved",
};

const PURPOSE_LABELS: Record<Extract<DemoGeography, { kind: "point" }>["purpose"], string> = {
  facility: "Facility address",
  headquarters: "Headquarters address, not a pickup site",
  office: "Office address, not a pickup site",
  unknown: "Address purpose not confirmed",
};

export interface DemoGeographyLabel {
  pending: boolean;
  /** Short line, e.g. "Approximate postal area 70802, US". */
  headline: string;
  /** Supporting detail, e.g. "Address purpose not confirmed". */
  detail: string | null;
}

export function demoGeographyLabel(geography: DemoGeography): DemoGeographyLabel {
  if (geography.kind === "pending") return { pending: true, headline: PENDING_LABELS[geography.reason], detail: null };
  // The reviewed label is the public wording. The raw postal code can be finer
  // than the area it approximates (ZIP+4, full UK postcode), so it is not shown.
  const headline =
    geography.precision === "postal_area" && !/postal area/i.test(geography.label)
      ? `Approximate postal area · ${geography.label}`
      : geography.label;
  return { pending: false, headline, detail: PURPOSE_LABELS[geography.purpose] };
}

export interface DemoFact {
  label: string;
  value: string;
}

function locationFact(geography: DemoGeography): DemoFact {
  const label = demoGeographyLabel(geography);
  return { label: "Location", value: label.detail ? `${label.headline} · ${label.detail}` : label.headline };
}

/** The card's value lines as plain text, for the map popup. */
export function demoMaterialFacts(item: DemoPlaylistMaterial, format: DemoValueFormatters): DemoFact[] {
  const estimates = [
    item.price.kind === "value" ? demoBasisLabel("price", item.price.basis) : null,
    item.volume.kind === "value" ? demoBasisLabel("volume", item.volume.basis) : null,
  ].filter((label): label is string => label !== null);
  return [
    { label: "Volume", value: demoVolumeLabel(item.volume, format) ?? "Not stated" },
    { label: item.kind === "seller" ? "Price" : "Target price", value: demoPriceLabel(item.price, format) ?? "Not stated" },
    { label: "Source", value: demoSourceStatusLabel(item.sourceStatus) },
    ...(estimates.length > 0 ? [{ label: "Estimates", value: estimates.join(", ") }] : []),
    locationFact(item.geography),
  ];
}

const RELATIONSHIP_LABELS: Record<DemoPlaylistRelationship["kind"], string> = {
  potential_buyer: "Potential buyer",
  potential_provider: "Potential provider",
  potential_synergy: "Potential synergy",
  // A competitor or similar generator, not a supplier to the primary company.
  similar_generator: "Other possible generator — unconfirmed",
};

export function demoRelationshipLabel(kind: DemoPlaylistRelationship["kind"]): string {
  return RELATIONSHIP_LABELS[kind];
}
