import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adminListingActions,
  adminListingKey,
  countByStatus,
  filterAdminListings,
  listingHasSds,
  listingStatusLabel,
  listingStatusTone,
} from "./admin-listings.ts";

const draft = { id: 3, title: "Rice husk", sellerCompanyName: "Delta Agri", listingStatusCode: "draft", documents: [] };
const published = {
  id: 12,
  title: "Coal tar pitch",
  sellerCompanyName: "Northfield Supply",
  listingStatusCode: "published",
  documents: [{ documentTypeCode: "photo" }, { documentTypeCode: "sds" }],
};
const closed = { id: 40, title: "Pine wood chips", sellerCompanyName: "GulfStar Biomass", listingStatusCode: "closed", documents: null };
const all = [draft, published, closed];

test("status filter keeps only the chosen status; all keeps everything", () => {
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "", searchIn: "product" }), all);
  assert.deepEqual(filterAdminListings(all, { status: "closed", search: "", searchIn: "product" }), [closed]);
  assert.deepEqual(filterAdminListings(all, { status: "paused", search: "", searchIn: "product" }), []);
});

test("search matches the chosen field and combines with the status filter", () => {
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "tar", searchIn: "product" }), [published]);
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "tar", searchIn: "seller" }), [closed]);
  assert.deepEqual(filterAdminListings(all, { status: "draft", search: "tar", searchIn: "product" }), []);
});

test("listing ids match exactly in any LS- form", () => {
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "LS-12", searchIn: "seller" }), [published]);
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "ls12", searchIn: "product" }), [published]);
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "40", searchIn: "product" }), [closed]);
  assert.deepEqual(filterAdminListings(all, { status: "all", search: "LS-1", searchIn: "product" }), []);
});

test("SDS indicator reads the sds document type only", () => {
  assert.equal(listingHasSds(published), true);
  assert.equal(listingHasSds(draft), false);
  assert.equal(listingHasSds(closed), false);
  assert.equal(listingHasSds({ documents: [{ documentTypeCode: "certification" }] }), false);
});

test("closed listings reopen; every other status closes", () => {
  assert.deepEqual(adminListingActions("closed"), { canClose: false, canReopen: true });
  for (const s of ["draft", "pending_review", "published", "paused"]) {
    assert.deepEqual(adminListingActions(s), { canClose: true, canReopen: false });
  }
});

test("status labels and tones", () => {
  assert.equal(listingStatusLabel("pending_review"), "Pending review");
  assert.equal(listingStatusLabel("archived_by_ops"), "Archived by ops");
  assert.equal(listingStatusTone("published"), "green");
  assert.equal(listingStatusTone("closed"), "red");
  assert.equal(listingStatusTone("draft"), "neutral");
});

test("counts and id keys", () => {
  assert.deepEqual(countByStatus(all), { draft: 1, published: 1, closed: 1 });
  assert.equal(adminListingKey("LS-12"), "12");
  assert.equal(adminListingKey("ls-7"), "7");
  assert.equal(adminListingKey("12"), "12");
  assert.equal(adminListingKey("new"), "new");
});
