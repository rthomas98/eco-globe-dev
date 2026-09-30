import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRefundMoney,
  isStripeRefundReference,
  newRefundIdempotencyKey,
  parseAmountToCents,
} from "./refund-format.ts";

test("typed amounts convert to integer cents without float drift", () => {
  assert.equal(parseAmountToCents("125.5"), 12550);
  assert.equal(parseAmountToCents("0.29"), 29);
  assert.equal(parseAmountToCents("1,250.07"), 125007);
  assert.equal(parseAmountToCents(" 10 "), 1000);
});

test("invalid, zero and over-precise amounts are rejected", () => {
  for (const value of ["", "0", "0.00", "-5", "1.234", "abc", "1e3", ".5"]) {
    assert.equal(parseAmountToCents(value), null, value);
  }
});

test("money is formatted from cents in the case currency", () => {
  assert.equal(formatRefundMoney(12550, "USD"), "$125.50");
  assert.equal(formatRefundMoney(100, "EUR"), "€1.00");
});

test("idempotency keys satisfy the contract shape and differ per attempt", () => {
  const a = newRefundIdempotencyKey();
  const b = newRefundIdempotencyKey();
  assert.match(a, /^[A-Za-z0-9_-]{16,100}$/);
  assert.notEqual(a, b);
});

test("only Stripe refund object IDs are accepted as references", () => {
  assert.equal(isStripeRefundReference("re_3PzAbc123"), true);
  assert.equal(isStripeRefundReference("pi_3PzAbc123"), false);
  assert.equal(isStripeRefundReference("re_"), false);
  assert.equal(isStripeRefundReference("re_abc; drop"), false);
});
