import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleRef, sampleStatusDisplay } from "./sample-status.ts";

test("mixed legacy sample statuses keep their recorded meaning", () => {
  const rows = ["received", "Received", "shipped", "requested", "accepted", "declined", "cancelled", "in_review", "", null];
  const labels = rows.map((s) => sampleStatusDisplay(s).label);
  assert.deepEqual(labels, [
    "Received",
    "Received",
    "Shipped",
    "Requested",
    "Accepted",
    "Declined",
    "cancelled (as recorded)",
    "in review (as recorded)",
    "Status not recorded",
    "Status not recorded",
  ]);
  assert.equal(sampleStatusDisplay("cancelled").known, false);
  assert.notEqual(sampleStatusDisplay("cancelled").label, "Requested");
});

test("sample references match the tracker format", () => {
  assert.equal(sampleRef(14), "SR-14");
});

import { legacySampleRows } from "./sample-status.ts";

// Live shape: legacy requests 1 and 2, buyer company 30, seller company 29,
// listing 21 (paused QA listing), both received and never shipped prepaid.
const legacy = [
  { id: 1, listingId: 21, listingTitle: "QA listing", status: "received", buyerCompanyName: "Buyer 30", sellerCompanyName: "Seller 29" },
  { id: 2, listingId: 21, listingTitle: "QA listing", status: "received", buyerCompanyName: "Buyer 30", sellerCompanyName: "Seller 29" },
];

test("two distinct received legacy requests render as two received rows with tracker refs", () => {
  const rows = legacySampleRows(legacy, "buyer");
  assert.deepEqual(rows.map((r) => [r.ref, r.anchorId, r.status.label, r.counterparty]), [
    ["SR-2", "sample-2", "Received", "From Seller 29"],
    ["SR-1", "sample-1", "Received", "From Seller 29"],
  ]);
  assert.deepEqual(legacySampleRows(legacy, "seller").map((r) => r.counterparty), ["For Buyer 30", "For Buyer 30"]);
  assert.deepEqual(legacySampleRows(legacy, "admin").map((r) => [r.ref, r.status.label, r.counterparty]), [
    ["SR-2", "Received", "Buyer 30 from Seller 29"],
    ["SR-1", "Received", "Buyer 30 from Seller 29"],
  ]);
});

test("duplicate rows collapse to one per saved id and unknown statuses stay as recorded", () => {
  const rows = legacySampleRows(
    [...legacy, { ...legacy[0]!, status: "received" }, { ...legacy[0]!, id: 3, status: "on_hold" }],
    "buyer",
  );
  assert.deepEqual(rows.map((r) => r.ref), ["SR-3", "SR-2", "SR-1"]);
  assert.equal(rows[0]?.status.label, "on hold (as recorded)");
  assert.equal(rows.filter((r) => r.status.label === "Received").length, 2);
});
