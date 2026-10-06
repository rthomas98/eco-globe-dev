import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalQuantityUnit, quantityUnitsMatch, quoteQuantityError } from "./quantity-units.ts";

test("safe legacy aliases match their canonical unit", () => {
  for (const [a, b] of [["unit", "units"], ["Units", "unit"], ["tonne", "tonnes"], ["t", "tonne"], [" TONNES ", "t"]])
    assert.equal(quantityUnitsMatch(a, b), true, `${a} ~ ${b}`);
  assert.equal(canonicalQuantityUnit("units"), "unit");
  assert.equal(canonicalQuantityUnit("t"), "tonne");
});

test("tons are never inferred to be metric tonnes or aliased", () => {
  for (const [a, b] of [["ton", "tonne"], ["tons", "tonnes"], ["tons", "t"], ["ton", "tons"], ["kg", "kgs"], ["lb", "unit"]])
    assert.equal(quantityUnitsMatch(a, b), false, `${a} !~ ${b}`);
  assert.equal(quantityUnitsMatch("ton", "ton"), true);
  assert.equal(quantityUnitsMatch("kg", "KG"), true);
});

test("missing units never match", () => {
  assert.equal(quantityUnitsMatch("", ""), false);
  assert.equal(quantityUnitsMatch(null, null), false);
  assert.equal(quantityUnitsMatch(undefined, "unit"), false);
});

test("quoted quantity respects saved MOQ and available stock", () => {
  const listing = { minimumOrderQuantity: 10, quantity: 990 };
  assert.equal(quoteQuantityError(10, listing, "units"), null);
  assert.equal(quoteQuantityError(990, listing, "units"), null);
  assert.match(quoteQuantityError(9, listing, "units") ?? "", /minimum order is 10/);
  assert.match(quoteQuantityError(991, listing, "units") ?? "", /Only 990/);
  assert.match(quoteQuantityError(0, listing, "units") ?? "", /positive/);
  assert.match(quoteQuantityError(1.0001, { minimumOrderQuantity: null, quantity: 5 }, "t") ?? "", /three decimal/);
  assert.match(quoteQuantityError(1, { minimumOrderQuantity: null, quantity: null }, "t") ?? "", /no available quantity/);
});
