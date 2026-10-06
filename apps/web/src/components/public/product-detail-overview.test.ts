import { test } from "node:test";
import assert from "node:assert/strict";
import { overviewFacts } from "./product-detail-data.ts";
import type { Listing } from "./browse-listings.ts";

const listing = (over: Partial<Listing>): Listing =>
  ({
    category: "Plastic",
    qtyNum: 990,
    quantityUnit: "units",
    teaser: false,
    moqNum: 10,
    moq: "10 units",
    frequency: null,
    location: "Baton Rouge, LA",
    state: "Solid",
    description: null,
    ...over,
  }) as Listing;

test("empty overview lists only saved facts", () => {
  assert.deepEqual(overviewFacts(listing({})), [
    { label: "Category", value: "Plastic" },
    { label: "Available", value: "990 units" },
    { label: "Minimum order", value: "10 units" },
    { label: "Location", value: "Baton Rouge, LA" },
  ]);
});

test("teasers keep withheld MOQ out and mark approximate quantity", () => {
  const facts = overviewFacts(listing({ teaser: true }));
  assert.equal(facts.find((f) => f.label === "Minimum order"), undefined);
  assert.equal(facts.find((f) => f.label === "Available")?.value, "Approx. 990 units");
});

test("absent values and defaulted state are never shown", () => {
  const facts = overviewFacts(listing({ qtyNum: null, moqNum: null, moq: "", location: "", category: " " }));
  assert.deepEqual(facts, []);
  assert.ok(!overviewFacts(listing({})).some((f) => f.value === "Solid"));
});
