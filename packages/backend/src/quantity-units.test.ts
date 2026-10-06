import assert from "node:assert/strict";
import test from "node:test";
import { sameQuantityUnit } from "./quantity-units.js";

test("RFQ and checkout units accept spelling aliases without quantity conversion", () => {
  for (const [left, right] of [["unit", "units"], [" Units ", "UNIT"], ["tonne", "tonnes"], ["t", "tonne"], ["kg", "KG"], ["tons", "tons"]] as const) {
    assert.equal(sameQuantityUnit(left, right), true);
    assert.equal(sameQuantityUnit(right, left), true);
  }
});

test("RFQ and checkout units reject ambiguous tons, different scales and empty units", () => {
  for (const [left, right] of [["tons", "tonne"], ["ton", "tonnes"], ["tons", "ton"], ["kg", "tonne"], ["lb", "kg"], ["unit", "kg"], ["", ""], [" ", "unit"]] as const) {
    assert.equal(sameQuantityUnit(left, right), false);
    assert.equal(sameQuantityUnit(right, left), false);
  }
});
