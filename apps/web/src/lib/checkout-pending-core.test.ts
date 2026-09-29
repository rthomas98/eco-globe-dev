import { test } from "node:test";
import assert from "node:assert/strict";
import { isPendingEntry, pendingScopeKey, validPendingEntries } from "./checkout-pending-core.ts";

const entry = {
  cartItemId: "5",
  orderId: 11,
  createdAt: 1,
  request: {
    listingId: 5,
    quantity: 6,
    idempotencyKey: "co-aaaaaaaaaaaaaaaaaaaa",
    deliveryMethod: "delivery",
    deliveryAddress: "1 Test St",
  },
};

test("pending storage is scoped per user and active company", () => {
  assert.equal(pendingScopeKey(undefined, 10), null, "signed out has no scope");
  assert.equal(pendingScopeKey(1, undefined), null, "no active company has no scope");
  assert.notEqual(pendingScopeKey(1, 10), pendingScopeKey(1, 20), "company switch changes scope");
  assert.notEqual(pendingScopeKey(1, 10), pendingScopeKey(2, 10), "different user changes scope");
});

test("well-formed entries validate", () => {
  assert.equal(isPendingEntry(entry), true);
});

test("malformed or mismatched entries are rejected", () => {
  assert.equal(isPendingEntry({ ...entry, orderId: "11" }), false);
  assert.equal(isPendingEntry({ ...entry, cartItemId: "6" }), false, "cart id must match listing");
  assert.equal(isPendingEntry({ ...entry, request: { ...entry.request, idempotencyKey: "short" } }), false);
  assert.equal(isPendingEntry({ ...entry, request: { ...entry.request, deliveryMethod: "drone" } }), false);
  assert.equal(isPendingEntry({ ...entry, request: { ...entry.request, quantity: 0 } }), false);
  assert.equal(isPendingEntry(null), false);
});

test("validPendingEntries drops bad rows and rows stored under another key", () => {
  const stored = { "5": entry, "7": entry, "8": { cartItemId: "8" } };
  assert.deepEqual(Object.keys(validPendingEntries(stored)), ["5"]);
  assert.deepEqual(validPendingEntries("garbage"), {});
});
