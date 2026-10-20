import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_PRICE_ESTIMATE_LABEL,
  DEMO_VOLUME_ESTIMATE_LABEL,
  NO_DEMO_ESTIMATES,
  combineDemoEstimateFields,
  demoEstimateBadgeLabels,
  listingQuantityLabel,
  listingStatusAllowedWithDemo,
} from "./demo-estimate-format.ts";

const priceOnly = combineDemoEstimateFields(true, { price: true, volume: false });
const both = combineDemoEstimateFields(true, { price: true, volume: true });
const malformed = combineDemoEstimateFields(true, { price: false, volume: false });

test("field flags only count when the demo marker is present", () => {
  assert.deepEqual(combineDemoEstimateFields(false, { price: true, volume: true }), NO_DEMO_ESTIMATES);
  assert.deepEqual(malformed, { marker: true, price: false, volume: false });
});

test("badges are field-specific", () => {
  assert.deepEqual(demoEstimateBadgeLabels(priceOnly), [DEMO_PRICE_ESTIMATE_LABEL]);
  assert.deepEqual(demoEstimateBadgeLabels(both), [DEMO_PRICE_ESTIMATE_LABEL, DEMO_VOLUME_ESTIMATE_LABEL]);
  assert.deepEqual(demoEstimateBadgeLabels(malformed), []);
  assert.deepEqual(demoEstimateBadgeLabels(NO_DEMO_ESTIMATES), []);
});

test("a demo quantity is never described as available; a price-only marker keeps the source quantity", () => {
  assert.equal(listingQuantityLabel("100 t", both), "100 t (demo volume estimate)");
  assert.equal(listingQuantityLabel("20 t", priceOnly), "20 t available");
  assert.equal(listingQuantityLabel("20 t", NO_DEMO_ESTIMATES), "20 t available");
  assert.equal(listingQuantityLabel(null, both), "Quantity not set");
});

test("while any demo marker remains only draft and closed can be saved", () => {
  for (const fields of [priceOnly, both, malformed]) {
    assert.equal(listingStatusAllowedWithDemo("draft", fields), true);
    assert.equal(listingStatusAllowedWithDemo("closed", fields), true);
    for (const status of ["pending_review", "published", "paused"])
      assert.equal(listingStatusAllowedWithDemo(status, fields), false);
  }
  for (const status of ["draft", "pending_review", "published", "paused", "closed"])
    assert.equal(listingStatusAllowedWithDemo(status, NO_DEMO_ESTIMATES), true);
});
