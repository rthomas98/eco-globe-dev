import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDemoMapPoints,
  clusterDemoMapSites,
  countDemoMaterials,
  demoBasisLabel,
  demoGeographyLabel,
  demoMaterialFacts,
  demoPriceLabel,
  demoRelationshipLabel,
  demoSourceStatusLabel,
  demoVolumeLabel,
  filterDemoMaterials,
  groupDemoMapSites,
  parseDemoGeography,
  parseDemoKindFilter,
  parseDemoPlaylistList,
  parseDemoPlaylistResponse,
  parseDemoPrice,
  resolveDemoCompanyId,
  resolveDemoPlaylistSlug,
  visibleDemoProfiles,
  visibleDemoRelationships,
  withDemoPlaylistParams,
  type DemoPlaylistData,
  type DemoPlaylistFilter,
} from "./demo-playlists.ts";
import { DEMO_PRICE_ESTIMATE_LABEL, DEMO_VOLUME_ESTIMATE_LABEL } from "./demo-estimate-format.ts";
import { describeUnit, formatMoney } from "./listing-format.ts";

const format = {
  money: (amount: number, currency: string) => formatMoney(amount, currency)!,
  unit: describeUnit,
};

const point = {
  kind: "point",
  latitude: 30.45,
  longitude: -91.18,
  precision: "reviewed_address",
  purpose: "headquarters",
  label: "Baton Rouge, LA",
  countryCode: "US",
  postalCode: "70802",
};

const sourcePrice = {
  kind: "value",
  amount: { kind: "scalar", value: 100 },
  currencyCode: "USD",
  perUnit: "tonne",
  direction: "buyer_pays",
  basis: "source",
};

const sourceVolume = {
  kind: "value",
  amount: { kind: "scalar", value: 20 },
  unit: "tonne",
  period: "scenario",
  basis: "source",
};

function material(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    companyId: "c-encore",
    kind: "buyer",
    title: "Captured CO2",
    materialTypeCode: "captured_co2",
    sourceStatus: "buyer_need",
    qualifier: null,
    equivalents: [],
    price: sourcePrice,
    volume: sourceVolume,
    geography: point,
    ...overrides,
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    playlist: { slug: "fuel-lsu", name: "FUEL/LSU" },
    companies: [
      { id: "c-encore", name: "Encore CO2", description: null, membership: "primary", materialState: "available", geography: point },
      {
        id: "c-codegig",
        name: "CodeGig",
        description: "Software services",
        membership: "primary",
        materialState: "no_material_data",
        geography: { kind: "pending", reason: "missing_location" },
      },
      {
        id: "c-prospect",
        name: "Prospect Refining",
        description: null,
        membership: "related",
        materialState: "no_material_data",
        geography: { ...point, latitude: 29.9, longitude: -90.1 },
      },
    ],
    materials: [material()],
    relationships: [
      {
        id: "r-1",
        fromCompanyId: "c-encore",
        target: { kind: "company", companyId: "c-prospect" },
        kind: "potential_buyer",
        material: "Captured CO2",
        materialTypeCode: "captured_co2",
      },
      {
        id: "r-2",
        fromCompanyId: "c-encore",
        target: { kind: "group", label: "Gulf Coast fertilizer plants" },
        kind: "potential_buyer",
        material: "Captured CO2",
        materialTypeCode: null,
      },
    ],
    counts: { companies: 99, materials: 99, mapped: 99, pending: 99 },
    ...overrides,
  };
}

const ALL: DemoPlaylistFilter = { company: null, kind: "all", query: "", network: false };

function data(overrides: Record<string, unknown> = {}): DemoPlaylistData {
  return parseDemoPlaylistResponse(body(overrides), "fuel-lsu");
}

test("playlist list keeps known slugs, FUEL first, and rejects malformed envelopes", () => {
  const list = parseDemoPlaylistList({
    ok: true,
    playlists: [
      { slug: "all", name: "ALL customers and feedstocks" },
      { slug: "secret", name: "Private" },
      { slug: "fuel-lsu", name: "FUEL/LSU", extra: "dropped" },
      { slug: "all", name: "Duplicate" },
    ],
  });
  assert.deepEqual(list, [
    { slug: "fuel-lsu", name: "FUEL/LSU" },
    { slug: "all", name: "ALL customers and feedstocks" },
  ]);
  assert.throws(() => parseDemoPlaylistList({ playlists: [] }));
  assert.throws(() => parseDemoPlaylistList({ ok: true }));
});

test("playlist response copies only allowlisted fields and drops orphaned rows", () => {
  const parsed = parseDemoPlaylistResponse(
    body({
      materials: [
        { ...material(), contactEmail: "x@example.com", sourceRow: "Sheet1!A2" },
        material({ id: "m-orphan", companyId: "c-missing" }),
        material({ id: "m-bad-price", price: { kind: "value", amount: { kind: "scalar", value: "100" } } }),
      ],
    }),
    "fuel-lsu",
  );
  assert.deepEqual(
    parsed.materials.map((item) => item.id),
    ["m-1"],
  );
  assert.equal("contactEmail" in parsed.materials[0]!, false);
  assert.equal("counts" in parsed, false);
  assert.throws(() => parseDemoPlaylistResponse(body(), "all"), /could not be read/);
  assert.throws(() => parseDemoPlaylistResponse({ ...body(), ok: false }, "fuel-lsu"));
});

test("relationships need a primary source and a known company or labelled group", () => {
  const parsed = data({
    relationships: [
      ...body().relationships,
      { id: "r-3", fromCompanyId: "c-prospect", target: { kind: "group", label: "x" }, kind: "potential_synergy", material: "Heat", materialTypeCode: null },
      { id: "r-4", fromCompanyId: "c-encore", target: { kind: "company", companyId: "nope" }, kind: "potential_provider", material: "Heat", materialTypeCode: null },
    ],
  });
  assert.deepEqual(
    parsed.relationships.map((item) => item.id),
    ["r-1", "r-2"],
  );
});

test("similar generators parse and read as unconfirmed context, not suppliers", () => {
  const parsed = data({
    relationships: [
      { id: "r-5", fromCompanyId: "c-encore", target: { kind: "company", companyId: "c-prospect" }, kind: "similar_generator", material: "Captured CO2", materialTypeCode: null },
      { id: "r-6", fromCompanyId: "c-encore", target: { kind: "group", label: "x" }, kind: "confirmed_supplier", material: "Heat", materialTypeCode: null },
    ],
  });
  assert.deepEqual(
    parsed.relationships.map((item) => [item.id, item.kind]),
    [["r-5", "similar_generator"]],
  );
  assert.equal(demoRelationshipLabel("similar_generator"), "Other possible generator — unconfirmed");
  assert.equal(demoRelationshipLabel("potential_buyer"), "Potential buyer");
});

test("source zero prices, gate fees, ranges and annual periods survive with explicit wording", () => {
  const zero = parseDemoPrice({ ...sourcePrice, amount: { kind: "scalar", value: 0 }, perUnit: "gal" })!;
  assert.equal(demoPriceLabel(zero, format), "$0.00 per gal");

  const gateFee = parseDemoPrice({ ...sourcePrice, amount: { kind: "scalar", value: -50 }, direction: "seller_pays_gate_fee" })!;
  assert.equal(demoPriceLabel(gateFee, format), "Seller pays a gate fee: $50.00 per metric tonne");
  // A signed gate-fee range reads as an ascending magnitude; the DTO keeps its sign.
  const gateRange = parseDemoPrice({ ...sourcePrice, amount: { kind: "range", min: -60, max: -50 }, direction: "seller_pays_gate_fee" })!;
  assert.equal(demoPriceLabel(gateRange, format), "Seller pays a gate fee: $50.00–$60.00 per metric tonne");
  assert.deepEqual(gateRange.kind === "value" && gateRange.amount, { kind: "range", min: -60, max: -50 });

  const range = parseDemoPrice({ ...sourcePrice, amount: { kind: "range", min: 80, max: 120 }, currencyCode: "eur" })!;
  assert.equal(demoPriceLabel(range, format), "€80.00–€120.00 per metric tonne");
  assert.equal(parseDemoPrice({ ...sourcePrice, amount: { kind: "range", min: 5, max: 1 } }), null);
  assert.equal(demoPriceLabel({ kind: "missing" }, format), null);

  assert.equal(
    demoVolumeLabel({ kind: "value", amount: { kind: "scalar", value: 390000 }, unit: "gal", period: "annual", basis: "source" }, format),
    "390,000 gal per year",
  );
  assert.equal(
    demoVolumeLabel({ kind: "value", amount: { kind: "scalar", value: 100 }, unit: "tonne", period: "scenario", basis: "demo_estimate" }, format),
    "100 t (demo scenario)",
  );
  assert.equal(
    demoVolumeLabel({ kind: "value", amount: { kind: "text", text: "Several railcars" }, unit: "unit", period: "monthly", basis: "source" }, format),
    "Several railcars per month",
  );
});

test("estimate badges are field specific and match the shared demo labels", () => {
  assert.equal(demoBasisLabel("price", "demo_estimate"), DEMO_PRICE_ESTIMATE_LABEL);
  assert.equal(demoBasisLabel("volume", "demo_estimate"), DEMO_VOLUME_ESTIMATE_LABEL);
  assert.equal(demoBasisLabel("price", "source_estimate"), "Source price estimate");
  assert.equal(demoBasisLabel("volume", "source"), null);
  assert.doesNotMatch(demoSourceStatusLabel("confirmed_stream"), /verified/i);
});

test("invalid or zero coordinates become pending, never a guessed pin", () => {
  assert.deepEqual(parseDemoGeography({ ...point, latitude: 0, longitude: 0 }), { kind: "pending", reason: "unresolved" });
  assert.deepEqual(parseDemoGeography({ ...point, latitude: 91 }), { kind: "pending", reason: "unresolved" });
  assert.deepEqual(parseDemoGeography({ ...point, precision: "postal_area", postalCode: null }), {
    kind: "pending",
    reason: "unresolved",
  });
  assert.deepEqual(parseDemoGeography({ kind: "pending", reason: "conflicting_address" }), {
    kind: "pending",
    reason: "conflicting_address",
  });
  const postal = parseDemoGeography({ ...point, precision: "postal_area", postalCode: "02139", countryCode: "us" });
  assert.equal(postal.kind === "point" && postal.postalCode, "02139");
  assert.deepEqual(demoGeographyLabel(postal), {
    pending: false,
    headline: "Approximate postal area · Baton Rouge, LA",
    detail: "Headquarters address, not a pickup site",
  });
  // Reviewed labels are shown as given; a finer raw postal code (ZIP+4, full UK postcode) never is.
  const reviewed = parseDemoGeography({
    ...point,
    precision: "postal_area",
    purpose: "unknown",
    label: "Approximate postal area FK3, GB",
    postalCode: "FK3 9XH",
    countryCode: "GB",
  });
  assert.equal(demoGeographyLabel(reviewed).headline, "Approximate postal area FK3, GB");
  assert.doesNotMatch(JSON.stringify(demoGeographyLabel(reviewed)), /9XH/);
  const census = parseDemoGeography({
    ...point,
    purpose: "unknown",
    label: "Company display location: Workbook address-range match, US — not a verified pickup site",
  });
  assert.deepEqual(demoGeographyLabel(census), {
    pending: false,
    headline: "Company display location: Workbook address-range match, US — not a verified pickup site",
    detail: "Address purpose not confirmed",
  });
  assert.equal(demoGeographyLabel({ kind: "pending", reason: "conflicting_address" }).pending, true);
});

test("filters drive one material set; counts cover materials only", () => {
  const parsed = data({
    materials: [
      material(),
      material({ id: "m-2", kind: "seller", title: "Biochar", materialTypeCode: "biochar", equivalents: ["Charcoal fines"] }),
      material({ id: "m-3", kind: "seller", title: "Wood chips", geography: { kind: "pending", reason: "missing_location" } }),
    ],
  });
  assert.deepEqual(countDemoMaterials(parsed.materials), { total: 3, mapped: 2, pending: 1 });
  assert.deepEqual(
    filterDemoMaterials(parsed, { ...ALL, kind: "seller" }).map((item) => item.id),
    ["m-2", "m-3"],
  );
  assert.deepEqual(
    filterDemoMaterials(parsed, { ...ALL, query: "charcoal" }).map((item) => item.id),
    ["m-2"],
  );
  assert.deepEqual(filterDemoMaterials(parsed, { ...ALL, company: "c-codegig" }), []);
  assert.deepEqual(
    visibleDemoProfiles(parsed, ALL).map((company) => company.name),
    ["CodeGig", "Encore CO2"],
  );
});

test("network stays hidden by default and adds only related-company pins when shown", () => {
  const parsed = data();
  assert.deepEqual(visibleDemoRelationships(parsed, ALL), []);
  const network = { ...ALL, network: true };
  const relationships = visibleDemoRelationships(parsed, network);
  assert.deepEqual(
    relationships.map((item) => item.id),
    ["r-1", "r-2"],
  );
  const keys = (filter: DemoPlaylistFilter, rels = visibleDemoRelationships(parsed, filter)) =>
    buildDemoMapPoints(parsed, filter, filterDemoMaterials(parsed, filter), rels, format).map((p) => p.key);
  // CodeGig's location is pending, so its profile has no pin; groups never get one.
  assert.deepEqual(keys(ALL), ["material:m-1"]);
  assert.deepEqual(keys(network), ["material:m-1", "network:c-prospect"]);
});

test("legacy gallery company names with the exact FUEL/LSU demo suffix still resolve", () => {
  const parsed = data();
  assert.equal(resolveDemoCompanyId("Encore CO2 (FUEL/LSU demo)", parsed.companies), "c-encore");
  // Only the exact suffix is stripped, and never onto a related company.
  assert.equal(resolveDemoCompanyId("Encore CO2 (FUEL/LSU)", parsed.companies), null);
  assert.equal(resolveDemoCompanyId("Encore CO2 (fuel/lsu demo)", parsed.companies), null);
  assert.equal(resolveDemoCompanyId("Prospect Refining (FUEL/LSU demo)", parsed.companies), null);
});

test("material search folds subscript digits without changing displayed titles", () => {
  const parsed = data({
    materials: [material({ id: "m-sub", title: "Captured CO₂" }), material({ id: "m-plain", title: "High-purity CO2" })],
  });
  const ids = (query: string) => filterDemoMaterials(parsed, { ...ALL, query }).map((item) => item.id);
  assert.deepEqual(ids("co2"), ["m-sub", "m-plain"]);
  assert.deepEqual(ids("CO₂"), ["m-sub", "m-plain"]);
  assert.equal(parsed.materials[0]!.title, "Captured CO₂");
});

test("every visible relationship company target gets one network pin, primary or related", () => {
  const parsed = data({
    companies: [
      ...body().companies,
      { id: "c-peer", name: "Peer Primary", description: null, membership: "primary", materialState: "available", geography: { ...point, latitude: 32, longitude: -93 } },
    ],
    relationships: [
      ...body().relationships,
      { id: "r-7", fromCompanyId: "c-encore", target: { kind: "company", companyId: "c-peer" }, kind: "potential_synergy", material: "Heat", materialTypeCode: null },
      { id: "r-8", fromCompanyId: "c-encore", target: { kind: "company", companyId: "c-peer" }, kind: "potential_buyer", material: "Steam", materialTypeCode: null },
    ],
  });
  const network = { ...ALL, network: true };
  const keys = buildDemoMapPoints(parsed, network, filterDemoMaterials(parsed, network), visibleDemoRelationships(parsed, network), format)
    .map((p) => p.key)
    .filter((key) => key.startsWith("network:"));
  assert.deepEqual(keys, ["network:c-prospect", "network:c-peer"]);
});

test("material popups carry the card's price, volume, source and location wording", () => {
  const parsed = data({
    materials: [material({ price: { ...sourcePrice, basis: "demo_estimate" } })],
  });
  const network = { ...ALL, network: true };
  const points = buildDemoMapPoints(parsed, network, parsed.materials, visibleDemoRelationships(parsed, network), format);
  const pin = points.find((p) => p.key === "material:m-1")!;
  assert.deepEqual(pin.facts, demoMaterialFacts(parsed.materials[0]!, format));
  assert.deepEqual(pin.facts, [
    { label: "Volume", value: "20 t (demo scenario)" },
    { label: "Target price", value: "$100.00 per metric tonne" },
    { label: "Source", value: "Stated buyer need" },
    { label: "Estimates", value: "Demo price estimate" },
    { label: "Location", value: "Baton Rouge, LA · Headquarters address, not a pickup site" },
  ]);
  // Company pins show only where the company is displayed, never material values.
  assert.deepEqual(points.find((p) => p.key === "network:c-prospect")!.facts, [
    { label: "Location", value: "Baton Rouge, LA · Headquarters address, not a pickup site" },
  ]);
});

test("same-site points group together and nearby sites cluster in screen space", () => {
  const parsed = data({
    materials: [material(), material({ id: "m-2" }), material({ id: "m-3", geography: { ...point, latitude: 31, longitude: -92 } })],
  });
  const points = buildDemoMapPoints(parsed, ALL, parsed.materials, [], format);
  const sites = groupDemoMapSites(points);
  assert.deepEqual(
    sites.map((site) => site.points.length),
    [2, 1],
  );
  const project = (site: { lat: number; lng: number }) => ({ x: site.lng * 10, y: site.lat * 10 });
  assert.equal(clusterDemoMapSites(sites, project, 5).length, 2);
  assert.equal(clusterDemoMapSites(sites, project, 50).length, 1);
});

test("URL state: FUEL default, playlist change clears company, legacy company names resolve", () => {
  const playlists = parseDemoPlaylistList({
    ok: true,
    playlists: [
      { slug: "all", name: "ALL" },
      { slug: "fuel-lsu", name: "FUEL" },
    ],
  });
  assert.equal(resolveDemoPlaylistSlug(null, playlists), "fuel-lsu");
  assert.equal(resolveDemoPlaylistSlug("all", playlists), "all");
  assert.equal(resolveDemoPlaylistSlug("bogus", playlists), "fuel-lsu");
  assert.equal(resolveDemoPlaylistSlug(null, []), null);

  const parsed = data();
  assert.equal(resolveDemoCompanyId("c-encore", parsed.companies), "c-encore");
  assert.equal(resolveDemoCompanyId("Encore CO2", parsed.companies), "c-encore");
  assert.equal(resolveDemoCompanyId("Prospect Refining", parsed.companies), null);
  assert.equal(parseDemoKindFilter("seller"), "seller");
  assert.equal(parseDemoKindFilter("nope"), "all");

  assert.equal(withDemoPlaylistParams("company=c-encore&kind=buyer", { playlist: "all" }), "?kind=buyer&playlist=all");
  assert.equal(withDemoPlaylistParams("", { kind: "all", query: "  ", network: false }), "");
  assert.equal(withDemoPlaylistParams("", { query: " co2 ", network: true }), "?q=co2&network=1");
});
