import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBuyerSavings,
  computeSellerRecovery,
  describeQuantitySource,
  quantityFromMetricTons,
  resolveRecoveryQuantity,
} from "./value-recovery.ts";
import { describeUnit } from "./listing-format.ts";

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

// Ana's Rice Hull Ash screenshot: unit-priced listing at 250/unit, buyer
// baseline 6/unit, quantity 200 entered directly, stale weight basis 1000.
test("a directly entered quantity is authoritative and ignores any weight basis", () => {
  const unit = describeUnit("unit");
  const withBasis = resolveRecoveryQuantity(200, unit, 1000, 37.5);
  const withoutBasis = resolveRecoveryQuantity(200, unit, null, 37.5);
  assert.deepEqual(withBasis, { kind: "direct", quantity: 200 });
  assert.deepEqual(withoutBasis, withBasis);
  const result = computeBuyerSavings({
    quantity: withBasis.kind === "direct" ? withBasis.quantity : Number.NaN,
    baselineDeliveredRatePerUnit: 6,
    listingPricePerUnit: 250,
  });
  assert.equal(result.savings, -48_800);
  assert.equal(result.savings, (6 - 250) * 200);
});

test("a direct quantity on a mass-priced listing is not rescaled from the weight step", () => {
  assert.deepEqual(resolveRecoveryQuantity(200, describeUnit("kg"), null, 5), { kind: "direct", quantity: 200 });
});

test("a blank quantity on a unit-priced listing needs an explicit metric-tonnes-per-unit basis", () => {
  const unit = describeUnit("unit");
  const blocked = resolveRecoveryQuantity(null, unit, null, 12);
  assert.equal(blocked.kind, "blocked");
  assert.match(blocked.kind === "blocked" ? blocked.reason : "", /metric tonnes one unit weighs/);
  assert.equal(resolveRecoveryQuantity(null, unit, 0, 12).kind, "blocked");
  assert.deepEqual(resolveRecoveryQuantity(null, unit, 0.5, 12), {
    kind: "derived",
    quantity: 24,
    metricTons: 12,
    tonnesPerUnit: 0.5,
    basisSource: "explicit",
  });
});

test("a basis of 1000 is treated as 1000 metric tonnes per unit, never as kilograms", () => {
  const derived = resolveRecoveryQuantity(null, describeUnit("unit"), 1000, 37.5);
  assert.equal(derived.kind, "derived");
  assert.equal(derived.kind === "derived" ? derived.quantity : null, 0.0375);
});

test("mass-priced listings derive by exact unit identity only", () => {
  const derived = resolveRecoveryQuantity(null, describeUnit("kg"), 999, 2);
  assert.equal(derived.kind, "derived");
  if (derived.kind !== "derived") return;
  assert.equal(derived.basisSource, "unit-identity");
  assert.equal(derived.tonnesPerUnit, 0.001);
  assert.equal(derived.quantity, 2000);
});

test("ambiguous 'ton' listings are never silently converted to metric tonnes", () => {
  assert.equal(resolveRecoveryQuantity(null, describeUnit("ton"), null, 10).kind, "blocked");
  const derived = resolveRecoveryQuantity(null, describeUnit("ton"), 0.907, 10);
  assert.equal(derived.kind === "derived" ? derived.basisSource : null, "explicit");
});

test("invalid direct quantities are rejected instead of falling back to the weight step", () => {
  assert.equal(resolveRecoveryQuantity(0, describeUnit("unit"), 1, 10).kind, "blocked");
  assert.equal(resolveRecoveryQuantity(Number.NaN, describeUnit("unit"), 1, 10).kind, "blocked");
  assert.equal(resolveRecoveryQuantity(null, describeUnit("tonne"), null, 0).kind, "blocked");
});

test("extreme finite inputs never produce a non-finite derived quantity", () => {
  const unit = describeUnit("unit");
  const overflow = resolveRecoveryQuantity(null, unit, Number.MIN_VALUE, Number.MAX_VALUE);
  assert.equal(overflow.kind, "blocked");
  assert.match(overflow.kind === "blocked" ? overflow.reason : "", /too large/);
  const underflow = resolveRecoveryQuantity(null, unit, Number.MAX_VALUE, Number.MIN_VALUE);
  assert.equal(underflow.kind, "blocked");
  const large = resolveRecoveryQuantity(null, unit, 1e-6, 1e9);
  assert.equal(large.kind === "derived" ? large.quantity : null, 1e15);
  assert.equal(resolveRecoveryQuantity(null, unit, Number.POSITIVE_INFINITY, 10).kind, "blocked");
  assert.equal(resolveRecoveryQuantity(null, unit, 1, Number.POSITIVE_INFINITY).kind, "blocked");
  assert.equal(resolveRecoveryQuantity(Number.POSITIVE_INFINITY, unit, null, 10).kind, "blocked");
  assert.equal(resolveRecoveryQuantity(Number.MAX_VALUE, unit, null, 10).kind, "direct");
});

test("quantity source wording states direct entry or the derivation", () => {
  const unit = describeUnit("unit");
  assert.equal(
    describeQuantitySource({ quantitySource: "direct", tonnesPerUnit: null, derivedFromMetricTons: null }, unit),
    "Entered directly in the listing's pricing unit",
  );
  assert.equal(
    describeQuantitySource({ quantitySource: "derived", tonnesPerUnit: 0.5, derivedFromMetricTons: 12 }, unit),
    "Derived from the weight step: 12 metric tonnes ÷ 0.5 t per unit",
  );
});
