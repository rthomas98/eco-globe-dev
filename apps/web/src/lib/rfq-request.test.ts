import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRfqDraft, type RfqDraft } from "./rfq-request.ts";

const base: RfqDraft = {
  title: "Rice husk",
  quantity: "50",
  targetPrice: "",
  countryCode: "US",
  stateProvince: "LA",
};

test("valid request keeps the entered values", () => {
  const result = validateRfqDraft({ ...base, targetPrice: "425.5", countryCode: "us" });
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.value, {
    title: "Rice husk",
    quantity: 50,
    targetPricePerUnit: 425.5,
    countryCode: "US",
    stateProvince: "LA",
  });
});

test("invalid quantity is an error, never replaced by 1", () => {
  for (const quantity of ["", "abc", "0", "-3"]) {
    const result = validateRfqDraft({ ...base, quantity });
    assert.equal(result.ok, false, quantity);
  }
  const ok = validateRfqDraft({ ...base, quantity: "1,250.5" });
  assert.equal(ok.ok && ok.value.quantity, 1250.5);
});

test("target price is optional but must be a plain number", () => {
  const blank = validateRfqDraft(base);
  assert.equal(blank.ok && blank.value.targetPricePerUnit, undefined);
  assert.equal(validateRfqDraft({ ...base, targetPrice: "$400-450 / ton" }).ok, false);
  assert.equal(validateRfqDraft({ ...base, targetPrice: "-1" }).ok, false);
});

test("delivery country is required, never assumed", () => {
  assert.equal(validateRfqDraft({ ...base, countryCode: "" }).ok, false);
  assert.equal(validateRfqDraft({ ...base, countryCode: "70" }).ok, false);
  const noRegion = validateRfqDraft({ ...base, countryCode: "NL", stateProvince: " " });
  assert.ok(noRegion.ok);
  assert.equal(noRegion.ok && noRegion.value.stateProvince, undefined);
});

test("title is required", () => {
  assert.equal(validateRfqDraft({ ...base, title: "  " }).ok, false);
});
