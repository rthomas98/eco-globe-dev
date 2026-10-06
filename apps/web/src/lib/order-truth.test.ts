import { test } from "node:test";
import assert from "node:assert/strict";
import { capturedPayment, receiptReadiness, trackerPriceLabel, type OrderPaymentRecord } from "./order-truth.ts";

const payment = (over: Partial<OrderPaymentRecord>): OrderPaymentRecord => ({
  id: 1,
  orderId: 20,
  providerPaymentId: "pi_123",
  amount: 30,
  currencyCode: "USD",
  paymentStatusCode: "captured",
  createdAt: "2026-09-29T10:00:00Z",
  ...over,
});

test("only a captured payment for the same order counts as paid", () => {
  assert.equal(capturedPayment([], 20), null);
  assert.equal(capturedPayment([payment({ paymentStatusCode: "pending" })], 20), null);
  assert.equal(capturedPayment([payment({ orderId: 19 })], 20), null);
  assert.equal(capturedPayment([payment({ id: 2 }), payment({ id: 5 })], 20)?.id, 5);
});

test("an unpaid order can never confirm receipt", () => {
  const unpaid = receiptReadiness({ paymentsLoaded: true, hasCapturedPayment: false, shipmentStatusCode: "in_transit" });
  assert.equal(unpaid.ready, false);
  const unknown = receiptReadiness({ paymentsLoaded: false, hasCapturedPayment: true, shipmentStatusCode: "in_transit" });
  assert.equal(unknown.ready, false);
});

test("a paid order confirms receipt only once dispatched", () => {
  assert.equal(receiptReadiness({ paymentsLoaded: true, hasCapturedPayment: true, shipmentStatusCode: null }).ready, false);
  assert.equal(receiptReadiness({ paymentsLoaded: true, hasCapturedPayment: true, shipmentStatusCode: "scheduled" }).ready, false);
  assert.equal(receiptReadiness({ paymentsLoaded: true, hasCapturedPayment: true, shipmentStatusCode: "delivered" }).ready, false);
  assert.deepEqual(receiptReadiness({ paymentsLoaded: true, hasCapturedPayment: true, shipmentStatusCode: "in_transit" }), { ready: true });
});

test("tracker price never renders a zero or currency-less placeholder", () => {
  assert.equal(trackerPriceLabel(0, "", ""), "Price not recorded");
  assert.equal(trackerPriceLabel(0, "USD", "ton"), "Price not recorded");
  assert.equal(trackerPriceLabel(30, null, "ton"), "Price not recorded");
  assert.equal(trackerPriceLabel(null, "USD", "ton"), "Price not recorded");
  assert.equal(trackerPriceLabel(30, "usd", "ton"), "$30.00 / ton");
  assert.equal(trackerPriceLabel(30, "USD", ""), "$30.00");
});
