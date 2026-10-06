import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describePrice,
  describeUnit,
  formatMoney,
  formatQuantity,
  formatQuantityWithUnitName,
  parseOptionalNumber,
  perUnitSuffix,
} from "./listing-format.ts";

test("missing price is unavailable, never zero", () => {
  const missing = describePrice(null, "USD", "tonne");
  assert.equal(missing.kind, "unavailable");
  assert.equal(missing.label, "Price unavailable");
  const zero = describePrice(0, "USD", "tonne");
  assert.equal(zero.kind, "zero");
  assert.equal(zero.label, "$0.00");
  const real = describePrice(450, "USD", "tonne");
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
  assert.equal(formatQuantityWithUnitName(100, "tonne"), "100 t (metric tonnes)");
  assert.equal(formatQuantityWithUnitName(1, "tonne"), "1 t (metric tonne)");
  assert.equal(formatQuantityWithUnitName(50, "unit"), "50 units");
  assert.equal(formatQuantityWithUnitName(null, "tonne"), null);
  assert.equal(describeUnit("unit").isMass, false);
  assert.equal(describeUnit("kg").tonnesPerUnit, 0.001);
});

test("a missing unit is reported, never assumed", () => {
  for (const code of [null, undefined, "", "  "]) {
    const unit = describeUnit(code);
    assert.equal(unit.code, "");
    assert.equal(unit.isMass, false);
    assert.equal(unit.tonnesPerUnit, null);
    assert.equal(perUnitSuffix(code), "");
  }
  assert.equal(formatQuantity(12, null), "12 (unit not recorded)");
  assert.equal(formatQuantityWithUnitName(12, ""), "12 (unit not recorded)");
  assert.equal(describePrice(5, "USD", null).perUnit, "");
});

test("optional number parsing distinguishes blank from zero", () => {
  assert.equal(parseOptionalNumber(""), null);
  assert.equal(parseOptionalNumber("0"), 0);
  assert.equal(parseOptionalNumber("1,250.5"), 1250.5);
  assert.equal(parseOptionalNumber("abc"), null);
});

test("plural unit aliases saved on live listings are preserved and formatted", () => {
  assert.equal(describeUnit("tonnes").code, "tonne");
  assert.equal(describeUnit("t").code, "tonne");
  assert.equal(describeUnit("units").code, "unit");
  assert.equal(formatQuantityWithUnitName(100, "tonnes"), "100 t (metric tonnes)");
  assert.equal(formatQuantityWithUnitName(3, "units"), "3 units");
});

test("ambiguous ton/tons stay as recorded and are never treated as metric", () => {
  for (const code of ["ton", "tons", "TONS"]) {
    const unit = describeUnit(code);
    assert.equal(unit.code, "ton");
    assert.equal(unit.isMass, false);
    assert.equal(unit.tonnesPerUnit, null);
    assert.notEqual(unit.short, "t");
  }
  assert.equal(formatQuantityWithUnitName(100, "tons"), "100 tons");
  assert.equal(formatQuantityWithUnitName(1, "ton"), "1 ton");
  assert.equal(perUnitSuffix("tons"), "/ton");
  assert.equal(describePrice(620, "USD", "tons").perUnit, "/ton");
});
