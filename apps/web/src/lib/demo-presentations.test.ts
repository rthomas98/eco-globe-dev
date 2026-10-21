import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_PRESENTATIONS_HREF,
  demoPresentationCompanies,
  describeMaterialType,
  filterDemoPresentations,
  parseDemoPresentation,
  parseDemoPresentationsResponse,
  parseKindFilter,
  withDemoPresentationFilters,
  type DemoPresentation,
} from "./demo-presentations.ts";

const base = {
  id: "0b6f2a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b",
  kind: "seller",
  companyName: "Example Fuels",
  title: "Used cooking oil",
  materialTypeCode: "used_cooking_oil",
  quantity: 120,
  quantityUnitCode: "tonne",
  price: 850,
  currencyCode: "USD",
  priceUnitCode: "tonne",
  priceEstimated: true,
  quantityEstimated: false,
};

test("only allowlisted public fields are kept", () => {
  const parsed = parseDemoPresentation({
    ...base,
    sourceListingId: 34,
    companyId: 7,
    contactEmail: "someone@example.com",
    notes: "private",
    sdsUrl: "https://example.com/sds.pdf",
  });
  assert.deepEqual(parsed, base);
  assert.deepEqual(Object.keys(parsed ?? {}).sort(), Object.keys(base).sort());
});

test("null amounts and codes are allowed; nothing is invented", () => {
  const parsed = parseDemoPresentation({
    ...base,
    kind: "buyer",
    quantity: null,
    quantityUnitCode: null,
    price: null,
    currencyCode: null,
    priceUnitCode: null,
  });
  assert.equal(parsed?.kind, "buyer");
  assert.equal(parsed?.price, null);
  assert.equal(parsed?.quantity, null);
});

test("malformed items are dropped", () => {
  const bad: Array<Record<string, unknown>> = [
    { ...base, id: "34" },
    { ...base, id: undefined },
    { ...base, kind: "admin" },
    { ...base, companyName: " " },
    { ...base, title: 5 },
    { ...base, materialTypeCode: "javascript:alert(1)" },
    { ...base, price: -1 },
    { ...base, price: Number.NaN },
    { ...base, quantity: "120" },
    { ...base, quantity: Number.POSITIVE_INFINITY },
    { ...base, currencyCode: "US D" },
    { ...base, priceUnitCode: "https://x" },
    { ...base, quantityUnitCode: undefined },
    { ...base, priceEstimated: "true" },
    { ...base, quantityEstimated: undefined },
  ];
  for (const item of bad) assert.equal(parseDemoPresentation(item), null, JSON.stringify(item));
  assert.equal(parseDemoPresentation(null), null);
  assert.equal(parseDemoPresentation("x"), null);
});

test("response must carry a presentations array", () => {
  assert.deepEqual(parseDemoPresentationsResponse({ ok: true, presentations: [base, { ...base, kind: "x" }] }), [base]);
  assert.deepEqual(parseDemoPresentationsResponse({ ok: true, presentations: [] }), []);
  assert.throws(() => parseDemoPresentationsResponse({ ok: true }));
  assert.throws(() => parseDemoPresentationsResponse({ presentations: [base] }));
  assert.throws(() => parseDemoPresentationsResponse({ ok: false, presentations: [base] }));
  assert.throws(() => parseDemoPresentationsResponse({ ok: "true", presentations: [base] }));
  assert.throws(() => parseDemoPresentationsResponse([base]));
  assert.throws(() => parseDemoPresentationsResponse(null));
});

const items = [
  { ...base, id: "1", kind: "seller", companyName: "Beta" },
  { ...base, id: "2", kind: "buyer", companyName: "Alpha" },
  { ...base, id: "3", kind: "buyer", companyName: "Beta" },
] as DemoPresentation[];

test("kind and company filters combine", () => {
  const ids = (list: DemoPresentation[]) => list.map((item) => item.id);
  assert.deepEqual(ids(filterDemoPresentations(items, { kind: "all", company: null })), ["1", "2", "3"]);
  assert.deepEqual(ids(filterDemoPresentations(items, { kind: "buyer", company: null })), ["2", "3"]);
  assert.deepEqual(ids(filterDemoPresentations(items, { kind: "seller", company: null })), ["1"]);
  assert.deepEqual(ids(filterDemoPresentations(items, { kind: "buyer", company: "Beta" })), ["3"]);
  assert.deepEqual(ids(filterDemoPresentations(items, { kind: "all", company: "Nobody" })), []);
  assert.deepEqual(demoPresentationCompanies(items), ["Alpha", "Beta"]);
});

test("filter URL parameters round-trip", () => {
  assert.equal(parseKindFilter("buyer"), "buyer");
  assert.equal(parseKindFilter("seller"), "seller");
  for (const value of [null, undefined, "", "all", "Buyer"]) assert.equal(parseKindFilter(value), "all");
  assert.equal(withDemoPresentationFilters("", { kind: "all", company: null }), "");
  assert.equal(withDemoPresentationFilters("", { kind: "buyer", company: "A & B" }), "?kind=buyer&company=A+%26+B");
  assert.equal(withDemoPresentationFilters("kind=buyer&company=X", { kind: "all", company: null }), "");
  assert.equal(DEMO_PRESENTATIONS_HREF, "/demo-feedstocks");
});

test("material codes read as words", () => {
  assert.equal(describeMaterialType("used_cooking_oil"), "Used cooking oil");
  assert.equal(describeMaterialType("tallow"), "Tallow");
});
