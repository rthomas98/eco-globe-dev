import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleCheckoutScope } from "./sample-checkout-scope.ts";

test("domestic standard-material scope is stated only for an eligible online checkout", () => {
  assert.equal(
    sampleCheckoutScope({ mode: "live", eligibility: { eligible: true } }),
    "domestic US · standard material",
  );
  assert.equal(
    sampleCheckoutScope({ mode: "simulation", eligibility: { eligible: true } }),
    "domestic US · standard material",
  );
});

test("ineligible or unconnected sample requests are described as an EcoGlobe inquiry", () => {
  for (const code of ["restricted", "international", "unverified", "disabled"]) {
    assert.equal(
      sampleCheckoutScope({
        mode: "live",
        eligibility: { eligible: false, code, reason: "r", canRefer: true },
      }),
      "EcoGlobe-assisted inquiry",
    );
  }
  assert.equal(
    sampleCheckoutScope({ mode: "unavailable", eligibility: { eligible: true } }),
    "EcoGlobe-assisted inquiry",
  );
});
