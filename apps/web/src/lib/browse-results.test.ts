import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BROWSE_DEMO_PLAYLISTS,
  DEFAULT_BROWSE_PLAYLIST,
  browseSearchCarryOver,
  chooseBrowseOrigin,
  publishedMarketplaceListings,
  selectionMapId,
  selectionUrlKey,
  withAllDistances,
  demoBrowseCompanies,
  demoGalleryHref,
  demoResultKey,
  formatDemoDistance,
  isDemoResultKey,
  marketplaceResultKey,
  normalizeBrowseQuery,
  parseBrowseDemoState,
  resolveDemoOrigin,
  safeBrowseReturnPath,
  selectDemoResults,
  withBrowseParams,
  type DemoSelectionInput,
} from "./browse-results.ts";
import { milesBetween } from "./radius-filter.ts";
import type { DemoPlaylistCompany, DemoPlaylistMaterial } from "./demo-playlists-contract.ts";

const batonRouge = { lat: 30.4515, lng: -91.1871 };

const point = (lat: number, lng: number, extra: Record<string, unknown> = {}) =>
  ({
    kind: "point",
    latitude: lat,
    longitude: lng,
    precision: "reviewed_address",
    purpose: "facility",
    label: "Baton Rouge, LA",
    countryCode: "US",
    postalCode: "70802",
    ...extra,
  }) as DemoPlaylistMaterial["geography"];

const companies: DemoPlaylistCompany[] = [
  { id: "c-encore", name: "Encore CO2", description: null, membership: "primary", materialState: "available", geography: point(30.45, -91.18) },
  { id: "c-oils", name: "Gulf Oils", description: null, membership: "primary", materialState: "available", geography: { kind: "pending", reason: "missing_location" } },
  { id: "c-tech", name: "Tech Only", description: null, membership: "primary", materialState: "no_material_data", geography: { kind: "pending", reason: "missing_location" } },
];

const base = {
  qualifier: null,
  equivalents: [] as string[],
  price: { kind: "missing" },
  volume: { kind: "missing" },
} as const;

const materials: DemoPlaylistMaterial[] = [
  { ...base, id: "m-co2-need", companyId: "c-encore", kind: "buyer", title: "Captured CO₂", materialTypeCode: "captured_co2", sourceStatus: "buyer_need", geography: point(30.46, -91.19) },
  { ...base, id: "m-co2-offer", companyId: "c-oils", kind: "seller", title: "Biogenic CO2 stream", materialTypeCode: "co2", sourceStatus: "identified_stream", geography: point(29.95, -90.07, { precision: "postal_area", label: "Approximate postal area 70112", postalCode: "70112" }) },
  { ...base, id: "m-uco", companyId: "c-oils", kind: "seller", title: "Used cooking oil", materialTypeCode: "used_cooking_oil", sourceStatus: "estimate", equivalents: ["UCO"], geography: { kind: "pending", reason: "conflicting_address" } },
  { ...base, id: "m-far", companyId: "c-oils", kind: "seller", title: "Tallow", materialTypeCode: "animal_fat", sourceStatus: "estimate", geography: point(51.92, 4.47, { label: "Rotterdam", countryCode: "NL", postalCode: "3011" }) },
];

function input(overrides: Partial<DemoSelectionInput> = {}): DemoSelectionInput {
  return {
    playlist: "fuel-lsu",
    materials,
    companies,
    state: { source: "all", company: null, kind: "all" },
    query: "",
    location: "",
    radiusMiles: 0,
    distanceTo: null,
    ...overrides,
  };
}

const ids = (items: Array<{ material: { id: string } }>) => items.map((item) => item.material.id);

test("CO2 and CO₂ fold together for every source", () => {
  assert.equal(normalizeBrowseQuery("  Captured  CO₂ "), "captured co2");
  assert.equal(normalizeBrowseQuery("co2"), normalizeBrowseQuery("CO₂"));
  assert.deepEqual(ids(selectDemoResults(input({ query: "co2" })).items), ["m-co2-need", "m-co2-offer"]);
  assert.deepEqual(ids(selectDemoResults(input({ query: "CO₂" })).items), ["m-co2-need", "m-co2-offer"]);
});

test("company names are searchable and buyer needs stay distinct from seller offers", () => {
  const encore = selectDemoResults(input({ query: "Encore" }));
  assert.deepEqual(ids(encore.items), ["m-co2-need"]);
  assert.equal(encore.items[0]!.material.kind, "buyer");
  assert.deepEqual(ids(selectDemoResults(input({ query: "co2", state: { source: "all", company: null, kind: "seller" } })).items), ["m-co2-offer"]);
  assert.deepEqual(ids(selectDemoResults(input({ query: "co2", state: { source: "all", company: null, kind: "buyer" } })).items), ["m-co2-need"]);
});

test("equivalents and material type words match; company filter scopes demo rows", () => {
  assert.deepEqual(ids(selectDemoResults(input({ query: "uco" })).items), ["m-uco"]);
  assert.deepEqual(ids(selectDemoResults(input({ query: "animal fat" })).items), ["m-far"]);
  const oils = selectDemoResults(input({ state: { source: "all", company: "c-oils", kind: "all" } }));
  assert.deepEqual(ids(oils.items), ["m-co2-offer", "m-uco", "m-far"]);
});

test("the marketplace source shows no demo rows", () => {
  const result = selectDemoResults(input({ state: { source: "marketplace", company: null, kind: "all" } }));
  assert.equal(result.items.length, 0);
  assert.equal(result.matched, 0);
});

test("without location or radius every match is listed, pending locations included", () => {
  const result = selectDemoResults(input());
  assert.deepEqual(ids(result.items), ["m-co2-need", "m-co2-offer", "m-uco", "m-far"]);
  assert.equal(result.pending.length, 0);
  assert.equal(result.radiusApplied, false);
});

test("a 100-mile radius uses material points, counts outside and keeps pending separate", () => {
  const result = selectDemoResults(
    input({ radiusMiles: 100, distanceTo: (p) => milesBetween(batonRouge, p) }),
  );
  assert.equal(result.radiusApplied, true);
  assert.deepEqual(ids(result.items), ["m-co2-need", "m-co2-offer"]);
  assert.deepEqual(ids(result.pending), ["m-uco"]);
  assert.equal(result.outside, 1);
  const postal = result.items.find((item) => item.material.id === "m-co2-offer")!;
  assert.equal(postal.distance!.basis, "postal_area");
  assert.match(formatDemoDistance(postal.distance!), /^≈ \d+ mi \(approximate postal area\)$/);
});

test("reviewed address points are address-range estimates, never exact-looking", () => {
  const result = selectDemoResults(input({ radiusMiles: 100, distanceTo: (p) => milesBetween(batonRouge, p) }));
  const address = result.items.find((item) => item.material.id === "m-co2-need")!;
  assert.equal(address.distance!.basis, "address_range");
  assert.match(formatDemoDistance(address.distance!), /^≈ [\d.]+ mi \(address-range estimate\)$/);
  assert.ok(result.items.every((item) => formatDemoDistance(item.distance!).startsWith("≈ ")));
  assert.doesNotMatch(formatDemoDistance(address.distance!), /postal/);
});

test("an approximate origin is stated on every measured distance", () => {
  const result = selectDemoResults(
    input({ radiusMiles: 100, distanceTo: (p) => milesBetween(batonRouge, p), originApproximate: true }),
  );
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.distance?.approximateOrigin === true));
  assert.match(formatDemoDistance(result.items[0]!.distance!), /approximate origin\)$/);
});

test("the search box matches published postal and country codes exactly", () => {
  assert.deepEqual(ids(selectDemoResults(input({ query: "70112" })).items), ["m-co2-offer"]);
  assert.deepEqual(ids(selectDemoResults(input({ query: "NL" })).items), ["m-far"]);
  // Pending rows carry no postal metadata, so they never match a postal search.
  assert.ok(!ids(selectDemoResults(input({ query: "70802" })).items).includes("m-uco"));
  // The material's public location label is searchable too.
  assert.deepEqual(ids(selectDemoResults(input({ query: "rotterdam" })).items), ["m-far"]);
});

test("origin choices sharing a generic label are told apart by public context", () => {
  // Encore's company point and its material point share "Baton Rouge, LA".
  const result = resolveDemoOrigin("70802", materials, companies, null);
  assert.equal(result.kind, "ambiguous");
  if (result.kind !== "ambiguous") return;
  assert.equal(result.options.length, 2);
  assert.equal(new Set(result.options.map((option) => option.label)).size, 1);
  assert.equal(new Set(result.options.map((option) => option.context)).size, 2);
  assert.ok(result.options.some((option) => option.context.includes("Encore CO2 — Captured CO₂")));
  assert.ok(result.options.every((option) => option.context.endsWith("70802 US")));
  assert.ok(result.options.every((option) => option.approximate && option.basis === "address_range"));
});

test("Where resolves published demo locations before a commercial match", () => {
  const commercial = { lat: 29.76, lng: -95.37, label: "Search location: Houston, TX" };
  const viewer = { lat: 1, lng: 1, label: "You" };
  const usAmbiguous = resolveDemoOrigin("US", materials, companies, null);
  // "US" substring-matches a commercial "Houston" location, but it is an ambiguous demo country match.
  assert.equal(
    chooseBrowseOrigin({ location: "US", resolution: usAmbiguous, demoLoading: false, commercialOrigin: commercial, fallbackOrigin: viewer }),
    undefined,
  );
  const postal = resolveDemoOrigin("70112", materials, companies, null);
  const chosen = chooseBrowseOrigin({ location: "70112", resolution: postal, demoLoading: false, commercialOrigin: commercial, fallbackOrigin: viewer });
  assert.equal(chosen?.lat, 29.95);
  assert.equal(chosen?.approximate, true);
  assert.match(chosen!.label, /Gulf Oils — Biogenic CO2 stream · 70112 US/);
  // No demo match: the commercial location is the fallback; while demo loads, nothing is assumed.
  const none = resolveDemoOrigin("Houston", materials, companies, null);
  assert.equal(chooseBrowseOrigin({ location: "Houston", resolution: none, demoLoading: false, commercialOrigin: commercial, fallbackOrigin: viewer }), commercial);
  assert.equal(chooseBrowseOrigin({ location: "Houston", resolution: none, demoLoading: true, commercialOrigin: commercial, fallbackOrigin: viewer }), undefined);
  // An unmatched Where never falls back to the viewer.
  assert.equal(chooseBrowseOrigin({ location: "Paris", resolution: none, demoLoading: false, commercialOrigin: undefined, fallbackOrigin: viewer }), undefined);
  assert.equal(chooseBrowseOrigin({ location: " ", resolution: none, demoLoading: false, commercialOrigin: commercial, fallbackOrigin: viewer }), viewer);
});

test("Show all distances clears Where and the chosen origin but keeps the rest", () => {
  assert.equal(
    withAllDistances("q=co2&location=70112&distance=100+mi&near=1,2&source=demo&kind=buyer&company=c&playlist=fuel-lsu&selected=demo:fuel-lsu:m&portfolioId=3"),
    "?q=co2&distance=Any&source=demo&kind=buyer&company=c&playlist=fuel-lsu&selected=demo%3Afuel-lsu%3Am&portfolioId=3",
  );
  // With Where cleared and no radius, matches beyond the old radius are listed again.
  const before = selectDemoResults(input({ location: "70112" }));
  const after = selectDemoResults(input({ location: "" }));
  assert.ok(!ids(before.items).includes("m-far"));
  assert.ok(ids(after.items).includes("m-far"));
});

test("URL selections are namespaced and map back to map/list ids", () => {
  assert.equal(selectionUrlKey("12"), "market:12");
  assert.equal(selectionUrlKey("demo:fuel-lsu:m"), "demo:fuel-lsu:m");
  assert.equal(selectionUrlKey(null), null);
  assert.equal(selectionMapId("market:12"), "12");
  assert.equal(selectionMapId("demo:fuel-lsu:m"), "demo:fuel-lsu:m");
  // A bare or unknown value never selects anything.
  for (const bad of ["12", "market:", "other:1", "", null]) assert.equal(selectionMapId(bad), null, String(bad));
});

test("Browse shows only published commercial listings", () => {
  const rows = [
    { id: "1", statusCode: "published" },
    { id: "2", statusCode: "draft" },
    { id: "3", statusCode: "pending_review" },
    { id: "4", statusCode: "paused" },
    { id: "5", statusCode: "Published" },
  ];
  assert.deepEqual(publishedMarketplaceListings(rows).map((row) => row.id), ["1"]);
});

test("the radius boundary is inclusive and deterministic", () => {
  const exactly = selectDemoResults(input({ radiusMiles: 100, distanceTo: () => 100 }));
  assert.equal(exactly.items.length, 3);
  const beyond = selectDemoResults(input({ radiusMiles: 100, distanceTo: () => 100.0001 }));
  assert.equal(beyond.items.length, 0);
  assert.equal(beyond.outside, 3);
});

test("no origin means the radius is not applied and nothing is claimed nearby", () => {
  const result = selectDemoResults(input({ radiusMiles: 100, distanceTo: null }));
  assert.equal(result.radiusApplied, false);
  assert.equal(result.items.length, 4);
  assert.ok(result.items.every((item) => item.distance === null));
});

test("a Where search without radius matches published postal/country only", () => {
  const result = selectDemoResults(input({ location: "70112" }));
  assert.deepEqual(ids(result.items), ["m-co2-offer"]);
  assert.deepEqual(ids(result.pending), ["m-uco"]);
  assert.deepEqual(ids(selectDemoResults(input({ location: "nl" })).items), ["m-far"]);
});

test("demo origins come from published geography and ambiguity needs a choice", () => {
  assert.deepEqual(resolveDemoOrigin("", materials, companies, null), { kind: "none" });
  assert.deepEqual(resolveDemoOrigin("Paris", materials, companies, null), { kind: "none" });
  const postal = resolveDemoOrigin("70112", materials, companies, null);
  assert.equal(postal.kind, "point");
  assert.equal(postal.kind === "point" && postal.origin.approximate, true);
  assert.equal(postal.kind === "point" && postal.origin.basis, "postal_area");
  const us = resolveDemoOrigin("US", materials, companies, null);
  assert.equal(us.kind, "ambiguous");
  if (us.kind !== "ambiguous") return;
  assert.ok(us.options.length > 1);
  const chosen = resolveDemoOrigin("US", materials, companies, us.options[1]!.key);
  assert.equal(chosen.kind === "point" && chosen.origin.key, us.options[1]!.key);
  // A `near` value that is not one of the matches is ignored, never used as coordinates.
  assert.equal(resolveDemoOrigin("US", materials, companies, "1.00000,1.00000").kind, "ambiguous");
});

test("keys are namespaced by source and playlist", () => {
  assert.equal(marketplaceResultKey("12"), "market:12");
  assert.equal(demoResultKey("fuel-lsu", "12"), "demo:fuel-lsu:12");
  assert.notEqual(demoResultKey("fuel-lsu", "x"), demoResultKey("all", "x"));
  assert.equal(isDemoResultKey("demo:fuel-lsu:12"), true);
  assert.equal(isDemoResultKey("12"), false);
});

test("URL state round-trips and keeps unrelated params", () => {
  const state = parseBrowseDemoState(new URLSearchParams("source=demo&kind=buyer&company=c-encore&pending=1&selected=demo:fuel-lsu:m"));
  assert.equal(state.source, "demo");
  assert.equal(state.kind, "buyer");
  assert.equal(state.company, "c-encore");
  assert.equal(state.showPending, true);
  assert.equal(state.playlist, DEFAULT_BROWSE_PLAYLIST);
  assert.equal(parseBrowseDemoState(new URLSearchParams("source=bogus&kind=x")).source, "all");
  assert.equal(
    withBrowseParams("q=co2&portfolioId=4&company=c-encore&selected=demo:x", { playlist: "fuel-lsu" }),
    "?q=co2&portfolioId=4&playlist=fuel-lsu",
  );
  // The canonical ALL default keeps a clean URL; switching back drops the param.
  assert.equal(withBrowseParams("playlist=fuel-lsu&company=c&near=1,2", { playlist: "all" }), "");
  assert.equal(withBrowseParams("q=co2", { source: "all", kind: "all" }), "?q=co2");
  assert.equal(withBrowseParams("", { source: "demo", showPending: true }), "?source=demo&pending=1");
  assert.equal(browseSearchCarryOver("source=demo&kind=buyer&q=x&selected=y&pending=1").toString(), "source=demo&kind=buyer");
});

test("ALL is the canonical default and FUEL/LSU is a separate selection", () => {
  assert.deepEqual(BROWSE_DEMO_PLAYLISTS, ["all", "fuel-lsu"]);
  assert.equal(DEFAULT_BROWSE_PLAYLIST, "all");
  assert.equal(parseBrowseDemoState(new URLSearchParams("")).playlist, "all");
  assert.equal(parseBrowseDemoState(new URLSearchParams("playlist=fuel-lsu")).playlist, "fuel-lsu");
  assert.equal(parseBrowseDemoState(new URLSearchParams("playlist=all")).playlist, "all");
  // Unknown or combined values never produce a union; they fall back to ALL alone.
  for (const slug of ["other", "all,fuel-lsu", "fuel-lsu+all"])
    assert.equal(parseBrowseDemoState(new URLSearchParams(`playlist=${encodeURIComponent(slug)}`)).playlist, "all");
});

test("one playlist per selection: shared ids stay distinct and are never merged", () => {
  // The same material id in both playlists yields separate keys, and a
  // selection reads only the materials it is given (one dataset).
  assert.notEqual(demoResultKey("all", "m-co2-need"), demoResultKey("fuel-lsu", "m-co2-need"));
  const all = selectDemoResults(input({ playlist: "all" }));
  assert.equal(all.items.length, materials.length);
  assert.ok(all.items.every((item) => item.playlist === "all" && item.key.startsWith("demo:all:")));
  const href = new URL(demoGalleryHref(all.items[0]!, "all", "/browse"), "https://x.invalid");
  assert.equal(href.searchParams.get("playlist"), "all");
});

test("the return path allows only exact public or buyer Browse", () => {
  assert.equal(safeBrowseReturnPath("/browse?q=co2&source=demo"), "/browse?q=co2&source=demo");
  assert.equal(safeBrowseReturnPath("/buyer/browse?portfolioId=3"), "/buyer/browse?portfolioId=3");
  for (const bad of [
    "https://evil.example/browse",
    "//evil.example/browse",
    "/\\evil.example",
    "javascript:alert(1)",
    "/browse/123",
    "/browsex",
    "/buyer/cart",
    "browse",
    "",
    null,
  ])
    assert.equal(safeBrowseReturnPath(bad), null, String(bad));
});

test("demo actions open only the gallery, never commercial routes", () => {
  const result = selectDemoResults(input({ query: "Encore" })).items[0]!;
  const href = demoGalleryHref(result, "buyer", "/browse?q=Encore");
  const url = new URL(href, "https://x.invalid");
  assert.equal(url.pathname, "/demo-feedstocks");
  assert.equal(url.searchParams.get("playlist"), "fuel-lsu");
  assert.equal(url.searchParams.get("company"), "c-encore");
  assert.equal(url.searchParams.get("kind"), "buyer");
  assert.equal(url.searchParams.get("material"), "m-co2-need");
  assert.equal(url.searchParams.get("from"), "/browse?q=Encore");
  assert.doesNotMatch(href, /\/browse\/|cart|checkout|quote|rfq/i);
  assert.equal(new URL(demoGalleryHref(result, "all", "//evil.example"), "https://x.invalid").searchParams.get("from"), null);
});

test("company options include only companies with material examples", () => {
  assert.deepEqual(
    demoBrowseCompanies(materials, companies).map((company) => company.id),
    ["c-encore", "c-oils"],
  );
});
