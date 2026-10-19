import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLOSE_LISTING_CONFIRMATION,
  PENDING_REVIEW_NOTICE,
  canCloseListing,
  canRestoreListing,
  countListingsByLifecycle,
  filterListingsByLifecycle,
} from "./listing-lifecycle.ts";

const listings = [
  { id: 29, statusCode: "published" },
  { id: 30, statusCode: "closed" },
  { id: 31, statusCode: "draft" },
  { id: 32, statusCode: "pending_review" },
  { id: 33, statusCode: "paused" },
];

test("every non-closed seller status can be closed; closed and unknown cannot", () => {
  for (const status of ["draft", "pending_review", "published", "paused"]) assert.equal(canCloseListing(status), true);
  for (const status of ["closed", "archived", "", null, undefined]) assert.equal(canCloseListing(status), false);
});

test("only closed listings offer restore to draft", () => {
  assert.equal(canRestoreListing("closed"), true);
  for (const status of ["draft", "pending_review", "published", "paused", null]) assert.equal(canRestoreListing(status), false);
});

test("lifecycle filter separates active and closed without dropping records", () => {
  assert.deepEqual(filterListingsByLifecycle(listings, "active").map((l) => l.id), [29, 31, 32, 33]);
  assert.deepEqual(filterListingsByLifecycle(listings, "closed").map((l) => l.id), [30]);
  assert.equal(filterListingsByLifecycle(listings, "all"), listings);
  assert.deepEqual(countListingsByLifecycle(listings), { active: 4, closed: 1, all: 5 });
});

test("close confirmation states data is kept and restore is possible", () => {
  assert.match(CLOSE_LISTING_CONFIRMATION, /documents, existing orders and history are kept/);
  assert.match(CLOSE_LISTING_CONFIRMATION, /restore it to draft/);
  assert.doesNotMatch(CLOSE_LISTING_CONFIRMATION, /delete/i);
});

test("pending-review copy explains staff review without promising delivery", () => {
  assert.match(PENDING_REVIEW_NOTICE, /EcoGlobe staff/);
  assert.match(PENDING_REVIEW_NOTICE, /not guaranteed/);
  assert.doesNotMatch(PENDING_REVIEW_NOTICE, /we (have )?(emailed|sent)|you will (get|receive) an email/i);
});
