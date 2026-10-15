import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesListingSearch } from "./listing-search.ts";

const gulfStarChips = { title: "Pine wood chips", sellerCompanyName: "GulfStar Biomass" };
const coalTar = { title: "Coal tar pitch", sellerCompanyName: "Northfield Supply" };
const noSeller = { title: "Rice husk", sellerCompanyName: null };

test("product search matches titles only, not seller names", () => {
  assert.equal(matchesListingSearch(gulfStarChips, "Tar"), false);
  assert.equal(matchesListingSearch(coalTar, "Tar"), true);
  assert.equal(matchesListingSearch(gulfStarChips, "Tar", "product"), false);
});

test("seller search is an explicit choice and matches seller names only", () => {
  assert.equal(matchesListingSearch(gulfStarChips, "tar", "seller"), true);
  assert.equal(matchesListingSearch(coalTar, "tar", "seller"), false);
  assert.equal(matchesListingSearch(noSeller, "rice", "seller"), false);
});

test("blank queries match everything; matching ignores case and padding", () => {
  assert.equal(matchesListingSearch(noSeller, "   "), true);
  assert.equal(matchesListingSearch(noSeller, "", "seller"), true);
  assert.equal(matchesListingSearch(coalTar, "  COAL  "), true);
});
