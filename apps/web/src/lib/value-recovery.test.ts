import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBuyerSavings,
  computeSellerRecovery,
  quantityFromMetricTons,
} from "./value-recovery.ts";

test("seller recovery sums avoided disposal and sale proceeds", () => {
  const result = computeSellerRecovery({
    quantity: 500,
    disposalRatePerUnit: 40,
    transportToDisposalRatePerUnit: 10,
    listingPricePerUnit: 150,
  });
  assert.equal(result.avoidedDisposalRatePerUnit, 50);
  assert.equal(result.avoidedDisposalCost, 25_000);
  assert.equal(result.saleProceeds, 75_000);
  assert.equal(result.totalRecovery, 100_000);
  assert.ok(result.exclusions.some((line) => /shipping/i.test(line)));
});

test("seller recovery with zero quantity yields zero, not an error", () => {
  const result = computeSellerRecovery({
    quantity: 0,
    disposalRatePerUnit: 40,
    transportToDisposalRatePerUnit: 10,
    listingPricePerUnit: 150,
  });
  assert.equal(result.totalRecovery, 0);
});

test("buyer savings match the deck example (155 − 150) × 500 = 2,500", () => {
  const result = computeBuyerSavings({
    quantity: 500,
    baselineDeliveredRatePerUnit: 155,
    listingPricePerUnit: 150,
  });
  assert.equal(result.baselineCost, 77_500);
  assert.equal(result.purchaseCost, 75_000);
  assert.equal(result.savings, 2_500);
});

test("buyer savings stay negative when the alternative costs more", () => {
  const result = computeBuyerSavings({
    quantity: 10,
    baselineDeliveredRatePerUnit: 100,
    listingPricePerUnit: 120,
  });
  assert.equal(result.savings, -200);
});

test("invalid inputs are rejected explicitly", () => {
  assert.throws(() =>
    computeBuyerSavings({ quantity: -1, baselineDeliveredRatePerUnit: 1, listingPricePerUnit: 1 }),
  );
  assert.throws(() =>
    computeSellerRecovery({
      quantity: 1,
      disposalRatePerUnit: Number.NaN,
      transportToDisposalRatePerUnit: 0,
      listingPricePerUnit: 1,
    }),
  );
});

test("unit-priced listings require an explicit weight basis", () => {
  assert.equal(quantityFromMetricTons(12, null), null);
  assert.equal(quantityFromMetricTons(12, 0), null);
  assert.equal(quantityFromMetricTons(12, 0.5), 24);
  assert.equal(quantityFromMetricTons(3, 1), 3);
});
