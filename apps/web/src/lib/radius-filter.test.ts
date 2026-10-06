import { test } from "node:test";
import assert from "node:assert/strict";
import { filterByRadius, formatMiles, milesBetween } from "./radius-filter.ts";

const batonRouge = { lat: 30.4515, lng: -91.1871 };
const listings = [
  { id: "near", lat: 30.46, lng: -91.19 },
  { id: "rotterdam", lat: 51.9244, lng: 4.4777 },
  { id: "jubail", lat: 27.0046, lng: 49.646 },
  { id: "no-pin", lat: null, lng: null },
];

test("haversine distance is in miles", () => {
  const nola = { lat: 29.9511, lng: -90.0715 };
  const miles = milesBetween(batonRouge, nola);
  assert.ok(miles > 70 && miles < 85, `got ${miles}`);
});

test("a 2 mile radius keeps only nearby listings and counts the rest", () => {
  const result = filterByRadius(listings, batonRouge, 2);
  assert.equal(result.applied, true);
  assert.deepEqual(result.items.map((l) => l.id), ["near"]);
  assert.equal(result.outside, 2);
  assert.equal(result.unlocated, 1);
});

test("no origin or no radius leaves the list unfiltered", () => {
  assert.equal(filterByRadius(listings, null, 2).items.length, 4);
  assert.equal(filterByRadius(listings, null, 2).applied, false);
  const off = filterByRadius(listings, batonRouge, 0);
  assert.equal(off.items.length, 4);
  assert.equal(off.applied, false);
  assert.ok(off.distances.has("rotterdam"));
  assert.ok(!off.distances.has("no-pin"));
});

test("invalid pins are unlocated, never nearby; invalid origin or radius is not applied", () => {
  const bad = [
    { id: "nan", lat: Number.NaN, lng: -91.19 },
    { id: "range", lat: 95, lng: -91.19 },
    { id: "inf", lat: 30.45, lng: Number.POSITIVE_INFINITY },
  ];
  const result = filterByRadius(bad, batonRouge, 2);
  assert.equal(result.items.length, 0);
  assert.equal(result.unlocated, 3);
  assert.equal(result.distances.size, 0);
  assert.equal(filterByRadius(listings, { lat: Number.NaN, lng: 0 }, 2).applied, false);
  assert.equal(filterByRadius(listings, { lat: 91, lng: 0 }, 2).applied, false);
  assert.equal(filterByRadius(listings, batonRouge, Number.NaN).applied, false);
  assert.equal(filterByRadius(listings, batonRouge, Number.POSITIVE_INFINITY).applied, false);
  assert.equal(filterByRadius(listings, batonRouge, -5).applied, false);
});

test("identical and antipodal points stay finite", () => {
  assert.equal(milesBetween(batonRouge, batonRouge), 0);
  const antipode = { lat: -batonRouge.lat, lng: batonRouge.lng + 180 };
  assert.ok(Number.isFinite(milesBetween(batonRouge, antipode)));
});

test("miles are formatted for cards", () => {
  assert.equal(formatMiles(undefined), "—");
  assert.equal(formatMiles(0.64), "0.6 mi");
  assert.equal(formatMiles(4970.4), "4,970 mi");
});
