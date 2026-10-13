import { test } from "node:test";
import assert from "node:assert/strict";
import {
  orderHeadline,
  orderStatusText,
  stageOrderScope,
  stageRecordRef,
  stageRefs,
  stageEvidence,
  stageRecordLabel,
  stageRecords,
  stageSummary,
  type TrackerData,
  type TrackerListing,
  type TrackerRecord,
} from "./api-tracker.ts";

const listing: TrackerListing = {
  id: 2,
  title: "Phase 1 Smoke Feedstock",
  quantity: 10,
  unit: "ton",
  price: 0,
  currency: "USD",
  status: "published",
  seller: "Sam R",
  city: "Baton Rouge",
  region: "LA",
  createdAt: "2026-09-01T00:00:00Z",
  interestCount: 0,
};

const order = (over: Partial<TrackerRecord>): TrackerRecord => ({
  id: 1,
  listingId: 2,
  status: "in_progress",
  createdAt: "2026-09-02T00:00:00Z",
  shippingStatus: null,
  shipmentId: null,
  paid: 0,
  ...over,
});

// Live shape: EG-1 completed, delivered and paid out; EG-2 in progress with
// no shipment; EG-5 in transit and unpaid; EG-7 cancelled; EG-9 another listing.
const data: TrackerData = {
  account: { name: "Sam R", verification: "verified", canExecute: true, approvalLimit: null, licence: null, payout: null },
  listings: [listing],
  samples: [],
  labs: [],
  pilots: [],
  orders: [
    order({ id: 9, listingId: 3, status: "completed", shippingStatus: "delivered", shipmentId: 90, paid: 1 }),
    order({ id: 7, status: "cancelled" }),
    order({ id: 5, shippingStatus: "in_transit", shipmentId: 50 }),
    order({ id: 2 }),
    order({ id: 1, status: "completed", shippingStatus: "delivered", shipmentId: 10, paid: 1 }),
  ],
  files: [],
  reports: [],
  sites: [],
};
const ids = (stage: string, source = data) => stageRecords(stage, 2, source).map((r) => r.id);

test("Seller paid lists only orders with a recorded paid payout", () => {
  assert.deepEqual(ids("Seller paid"), [1]);
  assert.equal(stageRecordLabel("Seller paid", data.orders[4]!), "seller payout paid");
  assert.equal(stageSummary("Seller paid", stageRecords("Seller paid", 2, data)), "Seller paid — EG-1 seller payout paid");
});

test("Shipping and In transit list only in-transit or delivered shipments", () => {
  assert.deepEqual(ids("Shipping"), [5, 1]);
  assert.deepEqual(ids("In transit"), [5, 1]);
  assert.equal(
    stageSummary("Shipping", stageRecords("Shipping", 2, data)),
    "Shipping — EG-5 shipment SHP-50 in transit, EG-1 shipment SHP-10 delivered",
  );
});

test("Delivered lists only delivered evidence; cancelled and unshipped orders are excluded", () => {
  assert.deepEqual(ids("Delivered"), [1]);
  for (const stage of ["Shipping", "Delivered", "Seller paid"]) {
    assert.ok(!ids(stage).includes(7), `${stage} excludes cancelled EG-7`);
    assert.ok(!ids(stage).includes(2), `${stage} excludes unshipped EG-2`);
  }
});

test("Order lists every order for the listing once, labelled by its own status", () => {
  const repeated = { ...data, orders: [...data.orders, order({ id: 1, status: "completed", shippingStatus: "scheduled", shipmentId: 11, paid: 1 })] };
  assert.deepEqual(ids("Order", repeated), [7, 5, 2, 1]);
  assert.deepEqual(ids("Seller paid", repeated), [1]);
  assert.equal(stageRecordLabel("Order", order({ id: 7, status: "cancelled" })), "order cancelled");
  assert.equal(stageRecordLabel("Order", order({ id: 5, shippingStatus: "in_transit" })), "order in progress · shipment in transit");
});

test("stage evidence follows the same per-stage records", () => {
  const seller = stageEvidence("seller", listing, data);
  assert.deepEqual(seller.slice(6), [true, true, true]);
  const unpaid = { ...data, orders: data.orders.filter((r) => r.id !== 1) };
  assert.deepEqual(stageEvidence("seller", listing, unpaid).slice(6), [true, false, false]);
  const onlyUnshipped = { ...data, orders: [order({ id: 2 }), order({ id: 7, status: "cancelled" })] };
  assert.deepEqual(stageEvidence("buyer", listing, onlyUnshipped).slice(4), [true, false, false]);
  assert.deepEqual(stageEvidence("seller", listing, onlyUnshipped).slice(6), [false, false, false]);
});

// Live buyer shape (Oct 7 workbook): one material with EG-20 completed,
// delivered and never paid, and a newer EG-24 still in progress with no shipment.
const pvc: TrackerData = {
  ...data,
  orders: [
    order({ id: 24, createdAt: "2026-10-07T15:00:00Z" }),
    order({ id: 20, createdAt: "2026-10-01T15:00:00Z", status: "completed", shippingStatus: "delivered", shipmentId: 200 }),
    // A second row for EG-20's shipment history must not count as another order.
    order({ id: 20, createdAt: "2026-10-01T15:00:00Z", status: "completed", shippingStatus: "delivered", shipmentId: 200 }),
  ],
};

test("material headline names the order count and labels the newest order as latest", () => {
  assert.equal(orderHeadline(2, pvc), "2 orders · latest EG-24 — order in progress");
  const single = { ...pvc, orders: pvc.orders.filter((r) => r.id === 20) };
  assert.equal(orderHeadline(2, single), "EG-20 — order completed · shipment delivered");
  assert.equal(orderHeadline(99, pvc), null);
});

test("Delivered names the order that recorded it and keeps the other order's own status", () => {
  assert.deepEqual(stageRefs("Delivered", 2, pvc), ["EG-20"]);
  assert.deepEqual(stageOrderScope("Delivered", 2, pvc), {
    recorded: ["EG-20"],
    notReached: ["EG-24 order in progress"],
  });
  // EG-20 stays completed and delivered with no payout recorded; nothing is rewritten.
  assert.deepEqual(stageOrderScope("Seller paid", 2, pvc), {
    recorded: [],
    notReached: ["EG-24 order in progress", "EG-20 order completed · shipment delivered"],
  });
  assert.equal(stageOrderScope("Order", 2, pvc), null);
  assert.equal(stageOrderScope("Sample", 2, pvc), null);
});

test("record references use the same prefixes as the rest of the portal", () => {
  assert.deepEqual(
    ["Sample", "Testing", "Pilot", "Order", "Delivered"].map((s) => stageRecordRef(s, 3)),
    ["SR-3", "LAB-3", "PR-3", "EG-3", "EG-3"],
  );
  assert.equal(orderStatusText({ status: "completed", shippingStatus: "completed" }), "order completed");
});
