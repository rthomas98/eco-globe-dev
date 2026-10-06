import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutFunded,
  receiptReadiness,
  trackerPriceLabel,
  type FundingOrder,
  type OrderPaymentRecord,
} from "./order-truth.ts";

const order: FundingOrder = { id: 20, buyerCompanyId: 7, creationSourceCode: "listing_checkout", totalAmount: 30, currencyCode: "USD" };
const payment = (over: Partial<OrderPaymentRecord>): OrderPaymentRecord => ({
  id: 1,
  orderId: 20,
  payerCompanyId: 7,
  providerPaymentId: "pi_123",
  amount: 30,
  currencyCode: "USD",
  paymentStatusCode: "captured",
  paymentTypeCode: "buyer_funding",
  createdAt: "2026-09-29T10:00:00Z",
  ...over,
});

test("a listing checkout is funded only by covering provider-linked buyer funding", () => {
  assert.equal(checkoutFunded(order, []), false);
  assert.equal(checkoutFunded(order, [payment({})]), true);
  assert.equal(checkoutFunded(order, [payment({ amount: 10 }), payment({ id: 2, amount: 20 })]), true);
  assert.equal(checkoutFunded({ ...order, totalAmount: 0.3 }, [payment({ amount: 0.1 }), payment({ id: 2, amount: 0.2 })]), true);
});

test("partial, wrong-currency, refunded, other-payer or unlinked records never fund", () => {
  assert.equal(checkoutFunded(order, [payment({ amount: 29.99 })]), false);
  assert.equal(checkoutFunded(order, [payment({ currencyCode: "EUR" })]), false);
  assert.equal(checkoutFunded(order, [payment({ paymentStatusCode: "refunded" })]), false);
  assert.equal(checkoutFunded(order, [payment({ paymentStatusCode: "pending" })]), false);
  assert.equal(checkoutFunded(order, [payment({ payerCompanyId: 8 })]), false);
  assert.equal(checkoutFunded(order, [payment({ providerPaymentId: null })]), false);
  assert.equal(checkoutFunded(order, [payment({ providerPaymentId: "  " })]), false);
  assert.equal(checkoutFunded(order, [payment({ paymentTypeCode: "seller_payout" })]), false);
  assert.equal(checkoutFunded(order, [payment({ orderId: 19 })]), false);
  assert.equal(checkoutFunded({ ...order, totalAmount: 0 }, [payment({ amount: 0 })]), false);
});

test("non-checkout orders are not gated by Stripe records and are not reported as paid", () => {
  assert.equal(checkoutFunded({ ...order, creationSourceCode: "admin_direct" }, []), null);
  assert.equal(checkoutFunded({ ...order, creationSourceCode: "manual" }, [payment({})]), null);
});

const ready = (over: Partial<Parameters<typeof receiptReadiness>[0]>) =>
  receiptReadiness({ funded: true, paymentsLoaded: true, fulfilment: "delivery", shipments: [{ statusCode: "in_transit" }], ...over }).ready;

test("an unfunded checkout can never confirm receipt", () => {
  assert.equal(ready({ funded: false }), false);
  assert.equal(ready({ funded: false, fulfilment: "pickup", shipments: [] }), false);
  assert.equal(ready({ paymentsLoaded: false }), false);
});

test("delivery receipt needs exactly one in-transit shipment", () => {
  assert.equal(ready({}), true);
  assert.equal(ready({ shipments: [] }), false);
  assert.equal(ready({ shipments: null }), false);
  assert.equal(ready({ shipments: [{ statusCode: "scheduled" }] }), false);
  assert.equal(ready({ shipments: [{ statusCode: "delivered" }] }), false);
  assert.equal(ready({ shipments: [{ statusCode: "in_transit" }, { statusCode: "in_transit" }] }), false);
});

test("a funded pickup with no shipment yet can confirm receipt", () => {
  assert.equal(ready({ fulfilment: "pickup", shipments: [] }), true);
  assert.equal(ready({ fulfilment: "pickup", shipments: null }), false);
  assert.equal(ready({ fulfilment: "pickup", shipments: [{ statusCode: "scheduled" }] }), false);
  assert.equal(ready({ fulfilment: "pickup", shipments: [{ statusCode: "in_transit" }] }), true);
});

test("non-checkout orders skip the funding gate but keep shipment rules", () => {
  assert.equal(ready({ funded: null, paymentsLoaded: false, fulfilment: "pickup", shipments: [] }), true);
  assert.equal(ready({ funded: null, paymentsLoaded: false, shipments: [{ statusCode: "scheduled" }] }), false);
});

test("tracker price shows saved zero prices and flags missing data", () => {
  assert.equal(trackerPriceLabel(0, "USD", "ton"), "$0.00 / ton");
  assert.equal(trackerPriceLabel(0, "", ""), "Price not recorded");
  assert.equal(trackerPriceLabel(30, null, "ton"), "Price not recorded");
  assert.equal(trackerPriceLabel(null, "USD", "ton"), "Price not recorded");
  assert.equal(trackerPriceLabel(30, "usd", "ton"), "$30.00 / ton");
  assert.equal(trackerPriceLabel(30, "USD", ""), "$30.00");
});
