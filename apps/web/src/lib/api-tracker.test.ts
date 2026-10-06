import { test } from "node:test";
import assert from "node:assert/strict";
import {
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
