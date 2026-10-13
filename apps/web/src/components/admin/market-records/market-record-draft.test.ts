// Uses the @/ path alias, so run with a tsconfig-aware loader, e.g.
// node --import <tsx>/dist/loader.mjs --test src/components/admin/market-records/market-record-draft.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffMarketRecordInput,
  mapServerFieldErrors,
  toDraft,
  validateDraft,
  type Draft,
} from "./market-record-draft";

const base = (changes: Partial<Draft> = {}): Draft => ({
  ...toDraft(null, "seller"),
  companyName: "Example Mill",
  feedstock: "Wood chips",
  ...changes,
});

test("blank optional values stay null, never zero", () => {
  const result = validateDraft(base());
  assert.ok(result.ok);
  assert.equal(result.input.price.value, null);
  assert.equal(result.input.volume.value, null);
  assert.equal(result.input.sourceChecked, null);
  assert.equal(result.input.sourceCheckedBy, null);
  assert.equal(result.input.sourceCheckedAt, null);
  assert.equal(result.input.sourceRecordType, "prospect");
});

test("an explicit zero price is kept and is never signed as a gate fee", () => {
  const result = validateDraft(
    base({ priceAmount: "0", priceIsGateFee: true, priceCurrency: "usd", pricePerUnit: "t" }),
  );
  assert.ok(result.ok);
  assert.equal(result.input.price.value, "0");
  assert.equal(result.input.price.currencyCode, "USD");
});

test("a gate fee is sent as a signed decimal string", () => {
  const result = validateDraft(
    base({ priceAmount: "45.50", priceIsGateFee: true, priceCurrency: "USD", pricePerUnit: "t" }),
  );
  assert.ok(result.ok);
  assert.equal(result.input.price.value, "-45.50");
});

test("a price needs currency and per-unit; a volume needs a unit", () => {
  const result = validateDraft(base({ priceAmount: "10", volumeValue: "1,200" }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.priceCurrency);
    assert.ok(result.errors.pricePerUnit);
    assert.ok(result.errors.volumeUnit);
  }
});

test("ambiguous comma input and excess precision are rejected, not reinterpreted", () => {
  for (const changes of [{ volumeValue: "12,34", volumeUnit: "t" }, { volumeValue: "1.2345", volumeUnit: "t" }]) {
    const result = validateDraft(base(changes));
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.volumeValue);
  }
});

test("record type must fit the side and buyer need is buyer-only", () => {
  const wrong = validateDraft(base({ sourceRecordType: "buyer_need" }));
  assert.equal(wrong.ok, false);
  const seller = validateDraft(base({ buyerNeed: "should be dropped" }));
  assert.ok(seller.ok);
  assert.equal(seller.input.buyerNeed, null);
});

test("edits require a reason; creates do not", () => {
  const edit = validateDraft(base(), true);
  assert.equal(edit.ok, false);
  if (!edit.ok) assert.ok(edit.errors.reason);
  assert.ok(validateDraft(base({ reason: "Corrected from source" }), true).ok);
  assert.ok(validateDraft(base()).ok);
});

test("original source check date is sent as a UTC midnight ISO string", () => {
  const result = validateDraft(base({ sourceCheckedAt: "2026-03-04", sourceCheckedBy: "Source analyst" }));
  assert.ok(result.ok);
  assert.equal(result.input.sourceCheckedAt, "2026-03-04T00:00:00.000Z");
  assert.equal(result.input.sourceCheckedBy, "Source analyst");
});

test("PATCH changes contain only changed groups, sent whole", () => {
  const before = validateDraft(base());
  const after = validateDraft(base({ city: "Boston" }));
  assert.ok(before.ok && after.ok);
  const changes = diffMarketRecordInput(before.input, after.input);
  assert.deepEqual(Object.keys(changes), ["address"]);
  assert.equal(changes.address?.city, "Boston");
  assert.equal(changes.address?.purpose, "unknown");
});

test("server field errors map to form fields and unknown keys are dropped", () => {
  assert.deepEqual(mapServerFieldErrors({ "price.value": "Too many decimals.", price: "Incomplete.", unknown: "x" }), {
    priceAmount: "Incomplete.",
  });
  assert.deepEqual(mapServerFieldErrors({ "address.countryCode": "Bad." }), { countryCode: "Bad." });
});
