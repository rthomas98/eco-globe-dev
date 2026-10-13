import { test } from "node:test";
import assert from "node:assert/strict";
import { rfqQuoteListingOptions } from "./rfq-quote-eligibility.ts";

const listing = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  title: `Listing ${id}`,
  listingStatusCode: "published",
  materialTypeCode: "rice_hull_ash",
  quantityUnit: "tonne",
  documents: [{ documentTypeCode: "sds" }, { documentTypeCode: "photo" }] as { documentTypeCode: string }[] | null,
  ...over,
});
const wanted = { materialTypeCode: "rice_hull_ash", quantityUnit: "tonnes" };

test("a published matching listing without an SDS is shown as blocked, never quotable", () => {
  // Live shape: Rice Hull Ash #22 published with only a photo saved.
  const options = rfqQuoteListingOptions([listing(22, { documents: [{ documentTypeCode: "photo" }] }), listing(23)], wanted);
  assert.deepEqual(options.map((o) => [o.listing.id, o.blockedReason === null]), [[22, false], [23, true]]);
  assert.match(options[0]!.blockedReason!, /Safety Data Sheet \(SDS\)/);
  assert.equal(rfqQuoteListingOptions([listing(24, { documents: null })], wanted)[0]?.blockedReason !== null, true);
});

test("non-matching listings are excluded before the SDS check", () => {
  const options = rfqQuoteListingOptions(
    [
      listing(1, { listingStatusCode: "draft" }),
      listing(2, { materialTypeCode: "biochar" }),
      // Short tons are never matched to tonne requests.
      listing(3, { quantityUnit: "ton" }),
      listing(4, { quantityUnit: "t" }),
    ],
    wanted,
  );
  assert.deepEqual(options.map((o) => o.listing.id), [4]);
});
