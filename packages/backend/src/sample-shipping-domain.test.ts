import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleBox,
  sampleEligibility,
  assertShippingTransition,
  requiresShippingRefund,
} from "./sample-shipping-domain.js";

test("parcel catalogue cannot be overridden with an arbitrary size or weight", () => {
  assert.equal(sampleBox("large").maxWeightKg, 25);
  for (const value of [null, 25, "Small", { code: "small", maxWeightKg: 100 }])
    assert.throws(() => sampleBox(value));
});
const eligible = {
  enabled: true,
  classification: "standard_solid" as const,
  specialHandling: false,
  originCountry: "US",
  destinationCountry: "US",
  receivingSiteVerified: true,
};
test("all nonstandard material and address paths are blocked server-side", () => {
  assert.deepEqual(sampleEligibility(eligible), { eligible: true });
  for (const classification of [
    "restricted",
    "liquid",
    "gas",
    "unreviewed",
  ] as const)
    assert.equal(
      sampleEligibility({ ...eligible, classification }).eligible,
      false,
    );
  for (const change of [
    { enabled: false },
    { specialHandling: true },
    { originCountry: "CA" },
    { destinationCountry: "GB" },
    { receivingSiteVerified: false },
  ])
    assert.equal(sampleEligibility({ ...eligible, ...change }).eligible, false);
});
test("only payment confirmation can mark paid and only tracking can mark delivered", () => {
  assert.throws(() =>
    assertShippingTransition("payment_pending", "paid", "seller"),
  );
  assertShippingTransition("payment_pending", "paid", "payment_provider");
  assert.throws(() =>
    assertShippingTransition("in_transit", "delivered", "seller"),
  );
  assertShippingTransition("in_transit", "delivered", "tracking_provider");
  assert.throws(() =>
    assertShippingTransition("expired", "in_transit", "seller"),
  );
  assertShippingTransition(
    "awaiting_dispatch",
    "in_transit",
    "tracking_provider",
  );
});
test("every paid failure path requires a refund, including failed delivery", () => {
  for (const state of ["declined", "expired", "delivery_failed"] as const)
    assert.equal(requiresShippingRefund(state), true);
  assert.equal(requiresShippingRefund("delivered"), false);
});

import { dispatchDeadline } from "./sample-shipping-domain.js";
test("10 business day deadlines use Central date, skip weekends and handle DST", () => {
  assert.equal(
    dispatchDeadline(new Date("2026-09-04T16:00:00Z")).toISOString(),
    "2026-09-19T04:59:59.999Z",
  );
  // Saturday UTC is still Friday in Chicago.
  assert.equal(
    dispatchDeadline(new Date("2026-09-05T01:00:00Z")).toISOString(),
    "2026-09-19T04:59:59.999Z",
  );
  assert.equal(
    dispatchDeadline(new Date("2026-10-23T16:00:00Z")).toISOString(),
    "2026-11-07T05:59:59.999Z",
  );
  assert.throws(() => dispatchDeadline(new Date("invalid")));
});

import { remainingBusinessDays } from "./sample-shipping-domain.js";
test("reminders count Central business days rather than UTC midnight boundaries", () => {
  assert.equal(
    remainingBusinessDays(
      new Date("2026-09-04T18:00:00Z"),
      new Date("2026-09-09T04:59:59Z"),
    ),
    2,
  );
  assert.equal(
    remainingBusinessDays(
      new Date("2026-09-05T01:00:00Z"),
      new Date("2026-09-09T04:59:59Z"),
    ),
    2,
  );
});
