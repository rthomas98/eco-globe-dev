/**
 * Browse results: marketplace listings plus presentation-only demo material
 * examples from one reviewed public playlist.
 *
 * Demo examples are never marketplace listings. They keep their own result
 * kind and namespaced key, their only action opens the demo gallery, and
 * marketplace-only filters (price, quantity, grade, carbon, category, tag)
 * never apply to them. Exactly one playlist dataset is read at a time; the
 * FUEL/LSU and ALL playlists overlap, so they are never concatenated.
 *
 * Kept free of path aliases and runtime imports so `node --test` can import
 * it; distance measurement is passed in by the caller.
 */

import type {
  DemoGeography,
  DemoPlaylistCompany,
  DemoPlaylistMaterial,
  DemoPlaylistSlug,
} from "./demo-playlists-contract";

// ── Search text ──────────────────────────────────────────────────────────────

/**
 * Search-only folding shared by marketplace and demo results: "CO₂" and "CO2"
 * match each other, case and repeated whitespace are ignored. Displayed text
 * is never changed.
 */
export function normalizeBrowseQuery(value: string): string {
  return value
    .replace(/[₀-₉]/g, (digit) => String(digit.charCodeAt(0) - 0x2080))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesQuery(needle: string, ...values: Array<string | null | undefined>): boolean {
  if (!needle) return true;
  return values.some((value) => !!value && normalizeBrowseQuery(value).includes(needle));
}

/** "used_cooking_oil" → "used cooking oil". */
function materialTypeWords(materialTypeCode: string): string {
  return materialTypeCode.replace(/[_.\-/]+/g, " ").trim().toLowerCase();
}

// ── URL state ────────────────────────────────────────────────────────────────

export type BrowseSource = "all" | "marketplace" | "demo";
export type BrowseRole = "all" | "seller" | "buyer";

export const BROWSE_SOURCE_PARAM = "source";
export const BROWSE_PLAYLIST_PARAM = "playlist";
export const BROWSE_COMPANY_PARAM = "company";
export const BROWSE_KIND_PARAM = "kind";
export const BROWSE_SELECTED_PARAM = "selected";
export const BROWSE_PENDING_PARAM = "pending";
export const BROWSE_NEAR_PARAM = "near";

export const BROWSE_SOURCES: Array<{ value: BrowseSource; label: string }> = [
  { value: "all", label: "All results" },
  { value: "marketplace", label: "Marketplace" },
  { value: "demo", label: "Demo examples" },
];

export const BROWSE_ROLES: Array<{ value: BrowseRole; label: string }> = [
  { value: "all", label: "All" },
  { value: "seller", label: "Seller offers" },
  { value: "buyer", label: "Buyer needs" },
];

/** Playlists offered in Browse, in display order. */
export const BROWSE_DEMO_PLAYLISTS: readonly DemoPlaylistSlug[] = ["all", "fuel-lsu"];
/**
 * ALL is the canonical default dataset. Exactly one playlist is read per
 * selection: FUEL/LSU overlaps ALL, so the two are never concatenated.
 */
export const DEFAULT_BROWSE_PLAYLIST: DemoPlaylistSlug = "all";

export const BROWSE_PLAYLIST_LABELS: Record<DemoPlaylistSlug, string> = {
  "fuel-lsu": "FUEL/LSU",
  all: "ALL",
};

export interface BrowseDemoState {
  source: BrowseSource;
  playlist: DemoPlaylistSlug;
  /** Demo company id; scopes demo rows only. */
  company: string | null;
  kind: BrowseRole;
  /** Selected result key, kept so a gallery return restores the selection. */
  selected: string | null;
  /** Opt-in reveal of demo matches whose location is pending. */
  showPending: boolean;
  /** Explicitly chosen demo origin when a Where search was ambiguous. */
  near: string | null;
}

interface ParamReader {
  get(name: string): string | null;
}

export function parseBrowseDemoState(params: ParamReader): BrowseDemoState {
  const source = params.get(BROWSE_SOURCE_PARAM);
  const playlist = params.get(BROWSE_PLAYLIST_PARAM);
  const kind = params.get(BROWSE_KIND_PARAM);
  return {
    source: source === "marketplace" || source === "demo" ? source : "all",
    playlist: BROWSE_DEMO_PLAYLISTS.find((slug) => slug === playlist) ?? DEFAULT_BROWSE_PLAYLIST,
    company: params.get(BROWSE_COMPANY_PARAM) || null,
    kind: kind === "seller" || kind === "buyer" ? kind : "all",
    selected: params.get(BROWSE_SELECTED_PARAM) || null,
    showPending: params.get(BROWSE_PENDING_PARAM) === "1",
    near: params.get(BROWSE_NEAR_PARAM) || null,
  };
}

/**
 * Query string (leading "?" when non-empty) with the given Browse params
 * changed; every other param (q, location, distance, portfolioId…) is kept.
 * Defaults are removed for clean URLs. Changing the playlist clears the
 * company and selection, whose ids are playlist-specific.
 */
export function withBrowseParams(search: string, patch: Partial<BrowseDemoState>): string {
  const params = new URLSearchParams(search);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  if ("source" in patch) set(BROWSE_SOURCE_PARAM, patch.source && patch.source !== "all" ? patch.source : null);
  if ("playlist" in patch) {
    set(BROWSE_PLAYLIST_PARAM, patch.playlist && patch.playlist !== DEFAULT_BROWSE_PLAYLIST ? patch.playlist : null);
    if (!("company" in patch)) params.delete(BROWSE_COMPANY_PARAM);
    if (!("selected" in patch)) params.delete(BROWSE_SELECTED_PARAM);
    if (!("near" in patch)) params.delete(BROWSE_NEAR_PARAM);
  }
  if ("company" in patch) set(BROWSE_COMPANY_PARAM, patch.company ?? null);
  if ("kind" in patch) set(BROWSE_KIND_PARAM, patch.kind && patch.kind !== "all" ? patch.kind : null);
  if ("selected" in patch) set(BROWSE_SELECTED_PARAM, patch.selected ?? null);
  if ("showPending" in patch) set(BROWSE_PENDING_PARAM, patch.showPending ? "1" : null);
  if ("near" in patch) set(BROWSE_NEAR_PARAM, patch.near ?? null);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * "Show all distances": turns the radius off and also clears the Where search
 * and any chosen demo origin, because a Where search alone still narrows
 * results to that place. The What query, source, playlist, company, role and
 * selection are kept.
 */
export function withAllDistances(search: string): string {
  const params = new URLSearchParams(search);
  params.set("distance", "Any");
  params.delete("location");
  params.delete(BROWSE_NEAR_PARAM);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Map/list id for a URL selection: marketplace listing id or the demo key. */
export function selectionMapId(selected: string | null): string | null {
  if (!selected) return null;
  if (selected.startsWith("market:")) return selected.slice("market:".length) || null;
  return isDemoResultKey(selected) ? selected : null;
}

/** URL selection for a map/list id: demo keys as-is, listing ids namespaced. */
export function selectionUrlKey(id: string | null): string | null {
  if (!id) return null;
  return isDemoResultKey(id) ? id : marketplaceResultKey(id);
}

/** Demo-specific params a new search keeps: the dataset and its scoping. */
export function browseSearchCarryOver(search: string): URLSearchParams {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of [BROWSE_SOURCE_PARAM, BROWSE_PLAYLIST_PARAM, BROWSE_COMPANY_PARAM, BROWSE_KIND_PARAM]) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  return next;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

/** Marketplace and demo keys can never collide, nor can two playlists' ids. */
export function marketplaceResultKey(listingId: string): string {
  return `market:${listingId}`;
}

export function demoResultKey(playlist: DemoPlaylistSlug, materialId: string): string {
  return `demo:${playlist}:${materialId}`;
}

export function isDemoResultKey(key: string | null | undefined): boolean {
  return !!key && key.startsWith("demo:");
}

// ── Origin from a Where search ───────────────────────────────────────────────

export interface BrowseOriginPoint {
  key: string;
  lat: number;
  lng: number;
  label: string;
  /** Public companies/materials at this point plus postal/country, to tell choices apart. */
  context: string;
  basis: DemoPointBasis;
  /** Published demo points are postal-area or address-range approximations. */
  approximate: true;
}

/**
 * How a published demo point was placed. Reviewed address points are
 * interpolated from address ranges, so neither basis is an exact facility,
 * pickup site or shipping origin.
 */
export type DemoPointBasis = "postal_area" | "address_range";

function pointBasis(geography: Extract<DemoGeography, { kind: "point" }>): DemoPointBasis {
  return geography.precision === "postal_area" ? "postal_area" : "address_range";
}

/** Commercial listings Browse may show: published only, whatever else a read returns. */
export function publishedMarketplaceListings<L extends { statusCode: string }>(listings: L[]): L[] {
  return listings.filter((listing) => listing.statusCode === "published");
}

export type DemoOriginResolution =
  | { kind: "none" }
  | { kind: "point"; origin: BrowseOriginPoint }
  | { kind: "ambiguous"; options: BrowseOriginPoint[] };

function originKey(lat: number, lng: number) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function compactPostal(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** True when a Where search names this published point's postal code, country or label. */
function geographyMatchesLocation(geography: DemoGeography, location: string): boolean {
  if (geography.kind !== "point") return false;
  const needle = normalizeBrowseQuery(location);
  if (!needle) return false;
  if (geography.postalCode && compactPostal(geography.postalCode) === compactPostal(location)) return true;
  if (/^[a-z]{2}$/.test(needle) && geography.countryCode.toLowerCase() === needle) return true;
  return normalizeBrowseQuery(geography.label).includes(needle);
}

/**
 * A distance origin from published demo geography only: postal code, country
 * code or reviewed label. Several distinct points are ambiguous and need an
 * explicit choice (`near`); no point is guessed and no address is geocoded.
 * Each choice names the public companies/materials there, so two points that
 * share a generic label can still be told apart.
 */
export function resolveDemoOrigin(
  location: string,
  materials: DemoPlaylistMaterial[],
  companies: DemoPlaylistCompany[],
  near: string | null,
): DemoOriginResolution {
  if (!normalizeBrowseQuery(location)) return { kind: "none" };
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const found = new Map<
    string,
    { geography: Extract<DemoGeography, { kind: "point" }>; names: Set<string> }
  >();
  const add = (geography: DemoGeography, name: string) => {
    if (geography.kind !== "point" || !geographyMatchesLocation(geography, location)) return;
    const key = originKey(geography.latitude, geography.longitude);
    const entry = found.get(key) ?? { geography, names: new Set<string>() };
    entry.names.add(name);
    found.set(key, entry);
  };
  for (const item of materials) add(item.geography, `${companyNames.get(item.companyId) ?? ""} — ${item.title}`);
  for (const company of companies) add(company.geography, company.name);

  const options = new Map<string, BrowseOriginPoint>();
  for (const [key, { geography, names }] of found) {
    const listed = Array.from(names).sort((a, b) => a.localeCompare(b));
    const people = listed.slice(0, 2).join("; ") + (listed.length > 2 ? ` +${listed.length - 2} more` : "");
    const area = [geography.postalCode, geography.countryCode].filter(Boolean).join(" ");
    options.set(key, {
      key,
      lat: geography.latitude,
      lng: geography.longitude,
      label: geography.label,
      context: [people, area].filter(Boolean).join(" · "),
      basis: pointBasis(geography),
      approximate: true,
    });
  }
  const list = Array.from(options.values()).sort(
    (a, b) => a.label.localeCompare(b.label) || a.context.localeCompare(b.context),
  );
  if (list.length === 0) return { kind: "none" };
  const chosen = near ? options.get(near) : undefined;
  if (chosen) return { kind: "point", origin: chosen };
  if (list.length === 1) return { kind: "point", origin: list[0]! };
  return { kind: "ambiguous", options: list };
}

export interface ChosenOrigin {
  lat: number;
  lng: number;
  label: string;
  approximate?: boolean;
}

/**
 * The distance origin. A Where search resolves against published demo
 * postal/country/label first; an ambiguous match waits for an explicit
 * choice; a saved marketplace location is used only when no demo location
 * matches (and the demo read is not still loading). A Where search never
 * falls back to the viewer or map center: unmatched means no origin.
 */
export function chooseBrowseOrigin(input: {
  location: string;
  resolution: DemoOriginResolution;
  demoLoading: boolean;
  commercialOrigin: ChosenOrigin | undefined;
  fallbackOrigin: ChosenOrigin | undefined;
}): ChosenOrigin | undefined {
  if (!input.location.trim()) return input.fallbackOrigin;
  const { resolution } = input;
  if (resolution.kind === "point")
    return {
      lat: resolution.origin.lat,
      lng: resolution.origin.lng,
      label: `${resolution.origin.label} (${resolution.origin.context})`,
      approximate: resolution.origin.approximate,
    };
  if (resolution.kind === "ambiguous" || input.demoLoading) return undefined;
  return input.commercialOrigin;
}

// ── Demo selection ───────────────────────────────────────────────────────────

/** Every demo distance is approximate: its point is a postal area or address-range estimate. */
export interface DemoDistance {
  miles: number;
  basis: DemoPointBasis;
  /** The origin is itself approximate (IP lookup, published demo point…). */
  approximateOrigin: boolean;
}

export interface DemoBrowseResult {
  kind: "demo";
  key: string;
  playlist: DemoPlaylistSlug;
  company: DemoPlaylistCompany;
  material: DemoPlaylistMaterial;
  /** Null when there is no origin or the material has no published point. */
  distance: DemoDistance | null;
}

export interface MarketplaceBrowseResult<L> {
  kind: "marketplace";
  key: string;
  listing: L;
}

export type BrowseResult<L> = MarketplaceBrowseResult<L> | DemoBrowseResult;

export interface DemoSelectionInput {
  playlist: DemoPlaylistSlug;
  materials: DemoPlaylistMaterial[];
  companies: DemoPlaylistCompany[];
  state: Pick<BrowseDemoState, "source" | "company" | "kind">;
  query: string;
  /** Where search text; matched against published postal/country/label. */
  location: string;
  radiusMiles: number;
  /** Miles from the active origin, or null when no origin is available. */
  distanceTo: ((point: { lat: number; lng: number }) => number) | null;
  /** The origin itself approximates an area (postal area, map center, city). */
  originApproximate?: boolean;
}

/** Exact published postal code or two-letter country code named by the query. */
function matchesPostalOrCountry(geography: DemoGeography, needle: string): boolean {
  if (geography.kind !== "point" || !needle) return false;
  if (geography.postalCode && compactPostal(geography.postalCode) === compactPostal(needle)) return true;
  return /^[a-z]{2}$/.test(needle) && geography.countryCode.toLowerCase() === needle;
}

export interface DemoSelection {
  /** Shown in the list; pinned when the material has a published point. */
  items: DemoBrowseResult[];
  /** Matches whose location is pending while a location/radius filter is active. */
  pending: DemoBrowseResult[];
  /** Matches with a published point beyond the radius. */
  outside: number;
  /** True when a radius was applied from a usable origin. */
  radiusApplied: boolean;
  /** Matches before any location/radius filtering. */
  matched: number;
}

const EMPTY_DEMO: DemoSelection = { items: [], pending: [], outside: 0, radiusApplied: false, matched: 0 };

/**
 * Demo rows for the current Browse state. Kind/company/query apply to demo
 * rows; marketplace-only filters never do. Distances use each material's own
 * published point — never its company's — and a pending location is never
 * treated as nearby or pinned.
 */
export function selectDemoResults(input: DemoSelectionInput): DemoSelection {
  if (input.state.source === "marketplace") return EMPTY_DEMO;
  const companies = new Map(input.companies.map((company) => [company.id, company]));
  const needle = normalizeBrowseQuery(input.query);
  const matched: DemoBrowseResult[] = [];
  for (const material of input.materials) {
    const company = companies.get(material.companyId);
    if (!company) continue;
    if (input.state.kind !== "all" && material.kind !== input.state.kind) continue;
    if (input.state.company && material.companyId !== input.state.company) continue;
    const geography = material.geography;
    if (
      !matchesPostalOrCountry(geography, needle) &&
      !includesQuery(
        needle,
        material.title,
        materialTypeWords(material.materialTypeCode),
        material.qualifier,
        company.name,
        geography.kind === "point" ? geography.label : null,
        ...material.equivalents,
      )
    )
      continue;
    const distance: DemoDistance | null =
      geography.kind === "point" && input.distanceTo
        ? {
            miles: input.distanceTo({ lat: geography.latitude, lng: geography.longitude }),
            basis: pointBasis(geography),
            approximateOrigin: !!input.originApproximate,
          }
        : null;
    matched.push({ kind: "demo", key: demoResultKey(input.playlist, material.id), playlist: input.playlist, company, material, distance });
  }

  const location = input.location.trim();
  const radiusApplied = !!input.distanceTo && Number.isFinite(input.radiusMiles) && input.radiusMiles > 0;
  if (!location && !radiusApplied)
    return { items: matched, pending: [], outside: 0, radiusApplied: false, matched: matched.length };

  const items: DemoBrowseResult[] = [];
  const pending: DemoBrowseResult[] = [];
  let outside = 0;
  for (const result of matched) {
    const geography = result.material.geography;
    if (geography.kind !== "point") {
      pending.push(result);
      continue;
    }
    // With a usable origin the radius decides; otherwise the Where text does.
    if (radiusApplied) {
      if (!result.distance || result.distance.miles > input.radiusMiles) outside += 1;
      else items.push(result);
    } else if (geographyMatchesLocation(geography, location)) items.push(result);
  }
  return { items, pending, outside, radiusApplied, matched: matched.length };
}

/** Demo companies that have at least one material in the playlist, sorted by name. */
export function demoBrowseCompanies(materials: DemoPlaylistMaterial[], companies: DemoPlaylistCompany[]) {
  const withMaterials = new Set(materials.map((item) => item.companyId));
  return companies
    .filter((company) => withMaterials.has(company.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Labels ───────────────────────────────────────────────────────────────────

export const DEMO_RESULT_LABEL = "Demo — not available for purchase";

export function demoRoleLabel(kind: DemoPlaylistMaterial["kind"]): string {
  return kind === "seller" ? "Seller offer" : "Buyer need";
}

const DEMO_BASIS_LABELS: Record<DemoPointBasis, string> = {
  postal_area: "approximate postal area",
  address_range: "address-range estimate",
};

/** "≈ 42 mi (address-range estimate)"; never an exact-looking distance. */
export function formatDemoDistance(distance: DemoDistance): string {
  const miles =
    distance.miles < 10
      ? `${distance.miles.toFixed(1)} mi`
      : `${Math.round(distance.miles).toLocaleString("en-US")} mi`;
  const notes = [DEMO_BASIS_LABELS[distance.basis], distance.approximateOrigin ? "approximate origin" : null];
  return `≈ ${miles} (${notes.filter(Boolean).join(", ")})`;
}

// ── Gallery navigation ───────────────────────────────────────────────────────

export const DEMO_GALLERY_PATH = "/demo-feedstocks";
export const DEMO_GALLERY_MATERIAL_PARAM = "material";
export const DEMO_GALLERY_RETURN_PARAM = "from";

const BROWSE_RETURN_PATHS = new Set(["/browse", "/buyer/browse"]);

/**
 * The return path when it is exactly public or buyer Browse on this origin;
 * anything else (external, protocol-relative, scheme, other paths) is null.
 */
export function safeBrowseReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(value, "https://ecoglobe.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://ecoglobe.invalid" || !BROWSE_RETURN_PATHS.has(url.pathname)) return null;
  return `${url.pathname}${url.search}`;
}

/**
 * The only action a demo result has: its example in the presentation
 * gallery, with playlist, company, role and material retained and a return
 * path to the originating Browse view.
 */
export function demoGalleryHref(result: DemoBrowseResult, role: BrowseRole, returnTo: string | null): string {
  const params = new URLSearchParams();
  params.set("playlist", result.playlist);
  params.set("company", result.company.id);
  if (role !== "all") params.set("kind", role);
  params.set(DEMO_GALLERY_MATERIAL_PARAM, result.material.id);
  const safeReturn = safeBrowseReturnPath(returnTo);
  if (safeReturn) params.set(DEMO_GALLERY_RETURN_PARAM, safeReturn);
  return `${DEMO_GALLERY_PATH}?${params.toString()}`;
}
