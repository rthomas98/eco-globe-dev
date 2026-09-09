import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describePrice,
  describeUnit,
  formatMoney,
  formatQuantityWithUnitName,
  parseOptionalNumber,
} from "./listing-format.ts";

test("missing price is unavailable, never zero", () => {
  const missing = describePrice(null, "USD", "ton");
  assert.equal(missing.kind, "unavailable");
  assert.equal(missing.label, "Price unavailable");
  const zero = describePrice(0, "USD", "ton");
  assert.equal(zero.kind, "zero");
  assert.equal(zero.label, "$0.00");
  const real = describePrice(450, "USD", "ton");
  assert.equal(real.kind, "available");
  assert.equal(real.label, "$450.00");
  assert.equal(real.perUnit, "/t");
});

test("currency is preserved without conversion", () => {
  assert.equal(formatMoney(60, "EUR"), "€60.00");
  assert.equal(formatMoney(-200, "USD"), "−$200.00");
  assert.equal(formatMoney(12, "SAR"), "SAR 12.00");
  assert.equal(formatMoney(null, "USD"), null);
});

test("MOQ carries an explicit unit name", () => {
  assert.equal(formatQuantityWithUnitName(100, "ton"), "100 t (metric tonnes)");
  assert.equal(formatQuantityWithUnitName(1, "tonne"), "1 t (metric tonne)");
  assert.equal(formatQuantityWithUnitName(50, "unit"), "50 units");
  assert.equal(formatQuantityWithUnitName(null, "ton"), null);
  assert.equal(describeUnit("unit").isMass, false);
  assert.equal(describeUnit("kg").tonnesPerUnit, 0.001);
});

test("optional number parsing distinguishes blank from zero", () => {
  assert.equal(parseOptionalNumber(""), null);
  assert.equal(parseOptionalNumber("0"), 0);
  assert.equal(parseOptionalNumber("1,250.5"), 1250.5);
  assert.equal(parseOptionalNumber("abc"), null);
});
