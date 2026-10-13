import { test } from "node:test";
import assert from "node:assert/strict";
import type { LogisticsOrder, LogisticsQuote, LogisticsShipment } from "./api-logistics.ts";
import { buyerShippingQuoteHint, salesStatusLines } from "../components/logistics/logistics-stage.ts";

const record = (over: Partial<LogisticsOrder>): LogisticsOrder => ({
  id: 25,
  orderStatusCode: "in_progress",
  buyerCompanyId: 30,
  sellerCompanyId: 29,
  buyerCompanyName: "Buyer 30",
  sellerCompanyName: "Seller 29",
  listingTitle: "Rice Hull Ash",
  quantity: 10,
  quantityUnitCode: "ton",
  shippingTypeCode: "delivery",
  currencyCode: "USD",
  deliveryAddress: null,
  fulfilmentLocked: false,
  shipment: null,
  quote: null,
  ...over,
});
const quote = (status: LogisticsQuote["status"]): LogisticsQuote => ({
  id: 1, status, carrierId: 1, carrierName: "Carrier", amount: 100, currencyCode: "USD",
  pickupScheduledAt: "2026-10-08T00:00:00Z", estimatedDeliveryAt: null, note: null,
});
const shipment = (statusCode: LogisticsShipment["statusCode"]) =>
  ({ id: 9, statusCode, bolUploadedAt: null }) as LogisticsShipment;

test("EG-25 shows the order and the unaccepted shipping quote as separately labelled facts", () => {
  const lines = salesStatusLines("in_progress", record({ quote: quote("offered") }));
  assert.equal(lines.order, "Order: In progress");
  assert.equal(lines.shipping?.label, "Shipping: Shipping quote sent · buyer has not accepted yet");
  assert.equal(lines.shipping?.tone, "blue");
});

test("EG-12 delivered shipment on an in-progress order keeps both recorded states", () => {
  const lines = salesStatusLines("in_progress", record({ id: 12, shipment: shipment("delivered") }));
  assert.deepEqual(lines, {
    order: "Order: In progress",
    shipping: { label: "Shipping: Delivered", tone: "green" },
  });
  // The shipment status does not identify who recorded delivery, so no actor is named.
  assert.doesNotMatch(lines.shipping!.label, /buyer|receipt/i);
});

test("no shipping line without a saved quote or shipment; unknown order codes show as recorded", () => {
  assert.deepEqual(salesStatusLines("in_progress", record({})), { order: "Order: In progress", shipping: null });
  assert.deepEqual(salesStatusLines("on_hold", undefined), { order: "Order: on hold", shipping: null });
  // An order not yet in progress never shows a quote as awaiting the buyer.
  assert.equal(salesStatusLines("approval_required", record({ orderStatusCode: "approval_required", quote: quote("offered") })).shipping?.label, "Shipping: Order not yet in progress");
});

test("buyer EG-25 card gets a separate hint from the saved offered shipping quote; the order stays Processing", () => {
  assert.equal(
    buyerShippingQuoteHint(record({ quote: quote("offered") })),
    "Shipping quote awaiting your acceptance · $100.00",
  );
  // No hint once accepted, without a quote, while disputed, or before the order is in progress.
  assert.equal(buyerShippingQuoteHint(record({ quote: quote("accepted"), shipment: shipment("scheduled") })), null);
  assert.equal(buyerShippingQuoteHint(record({})), null);
  assert.equal(buyerShippingQuoteHint(record({ quote: quote("offered"), fulfilmentLocked: true })), null);
  assert.equal(buyerShippingQuoteHint(record({ orderStatusCode: "approval_required", quote: quote("offered") })), null);
  assert.equal(buyerShippingQuoteHint(undefined), null);
});
