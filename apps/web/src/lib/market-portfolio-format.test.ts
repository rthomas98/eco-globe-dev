import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PORTFOLIO_LIMITS,
  isEligiblePortfolioCompany,
  isEligiblePortfolioListing,
  mergeIds,
  parseIdList,
  parsePortfolioParam,
  shouldClearPortfolioAfterCompanyChange,
  toPortfolioWrite,
  validatePortfolioDraft,
  withPortfolioParam,
  type PortfolioDraft,
} from "./market-portfolio-format.ts";

const draft: PortfolioDraft = {
  name: "  Gulf Coast demo ",
  description: "  ",
  recordIds: [3],
  listingIds: [10, 11],
  companyIds: [7],
  reason: " Prepare demo ",
};

test("typed IDs keep unique positive integers and report everything else", () => {
  assert.deepEqual(parseIdList("12, 15 #18;12\n0 -3 4.5 abc 9007199254740993"), {
    ids: [12, 15, 18],
    invalid: ["0", "-3", "4.5", "abc", "9007199254740993"],
  });
  assert.deepEqual(parseIdList("   "), { ids: [], invalid: [] });
  assert.deepEqual(mergeIds([1, 2], [2, 3, 0]), [1, 2, 3]);
});

test("draft validation follows the contract limits", () => {
  assert.deepEqual(validatePortfolioDraft(draft), {});
  const errors = validatePortfolioDraft({
    ...draft,
    name: " ",
    description: "x".repeat(PORTFOLIO_LIMITS.descriptionMax + 1),
    recordIds: Array.from({ length: PORTFOLIO_LIMITS.idsMax + 1 }, (_, i) => i + 1),
    listingIds: [4, 4],
    companyIds: [0],
    reason: "",
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "companyIds",
    "description",
    "listingIds",
    "name",
    "reason",
    "recordIds",
  ]);
  assert.ok(validatePortfolioDraft({ ...draft, name: "x".repeat(121) }).name);
  assert.ok(validatePortfolioDraft({ ...draft, reason: "x".repeat(1001) }).reason);
});

test("request body contains only known fields, trimmed, empty description as null", () => {
  assert.deepEqual(toPortfolioWrite(draft), {
    name: "Gulf Coast demo",
    description: null,
    recordIds: [3],
    listingIds: [10, 11],
    companyIds: [7],
    reason: "Prepare demo",
  });
});

test("portfolio URL parameter: only absent means none; blank or non-canonical is invalid", () => {
  assert.deepEqual(parsePortfolioParam(null), { kind: "none" });
  assert.deepEqual(parsePortfolioParam("42"), { kind: "valid", id: 42 });
  assert.deepEqual(parsePortfolioParam("2147483647"), { kind: "valid", id: 2147483647 });
  for (const raw of ["", " ", "0", "01", "+1", " 1", "1 ", "-1", "4a", "1e3", "1.0", "2147483648", "99999999999"]) {
    assert.deepEqual(parsePortfolioParam(raw), { kind: "invalid", raw }, JSON.stringify(raw));
  }
});

test("lookups offer only members the server accepts", () => {
  assert.equal(isEligiblePortfolioListing({ listingStatusCode: "published", sellerVerificationStatusCode: "verified" }), true);
  assert.equal(isEligiblePortfolioListing({ listingStatusCode: "published" }), true);
  for (const code of ["draft", "paused", "pending_review", "closed"])
    assert.equal(isEligiblePortfolioListing({ listingStatusCode: code }), false, code);
  assert.equal(
    isEligiblePortfolioListing({ listingStatusCode: "published", sellerVerificationStatusCode: "inactive" }),
    false,
  );
  assert.equal(isEligiblePortfolioCompany({ verificationStatusCode: "verified" }), true);
  assert.equal(isEligiblePortfolioCompany({ verificationStatusCode: "pending" }), true);
  assert.equal(isEligiblePortfolioCompany({ verificationStatusCode: "inactive" }), false);
  assert.equal(isEligiblePortfolioCompany({ verificationStatusCode: "suspended" }), false);
});

test("switching portfolio keeps every other URL filter", () => {
  assert.equal(withPortfolioParam("q=char&distance=50", 7), "?q=char&distance=50&portfolioId=7");
  assert.equal(withPortfolioParam("portfolioId=7&q=char", 9), "?portfolioId=9&q=char");
  assert.equal(withPortfolioParam("portfolioId=7&q=char", null), "?q=char");
  assert.equal(withPortfolioParam("portfolioId=7", null), "");
});

test("company change clears only a group the new company is not assigned to", () => {
  const valid = { kind: "valid", id: 7 } as const;
  assert.equal(
    shouldClearPortfolioAfterCompanyChange({ companyChanged: true, selected: valid, assignedIds: [3] }),
    true,
  );
  assert.equal(
    shouldClearPortfolioAfterCompanyChange({ companyChanged: true, selected: valid, assignedIds: [7] }),
    false,
  );
  assert.equal(
    shouldClearPortfolioAfterCompanyChange({ companyChanged: false, selected: valid, assignedIds: [] }),
    false,
    "an explicit link on first load is left for the server to decide",
  );
  assert.equal(
    shouldClearPortfolioAfterCompanyChange({ companyChanged: true, selected: { kind: "invalid", raw: "" }, assignedIds: [] }),
    true,
  );
  assert.equal(
    shouldClearPortfolioAfterCompanyChange({ companyChanged: true, selected: valid, assignedIds: null }),
    false,
    "waits for the new company's assignments to load",
  );
});
