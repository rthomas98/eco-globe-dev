import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUYER_DRAFTS_HREF,
  DRAFT_SHORTCUT_HREF,
  SELLER_DRAFTS_HREF,
  companyDraftShortcuts,
  draftListingsOnly,
  isDraftStatusParam,
  isRoleSwitchVerified,
  needsRoleSwitch,
  withDraftStatusParam,
} from "./company-draft-shortcuts.ts";

const membership = (id: number, companyTypeCode: string, legalName = `Company ${id}`) => ({
  id,
  legalName,
  companyTypeCode,
  memberRoleCode: "member",
  permissionTierCode: "standard",
  canApproveTransactions: false,
  canExecuteTransactions: false,
});

test("shortcuts follow the active company's type and the account's roles", () => {
  const companies = [membership(1, "seller"), membership(2, "both", "Example Fuels"), membership(3, "buyer")];
  const roles: Array<"buyer" | "seller"> = ["buyer", "seller"];
  assert.deepEqual(companyDraftShortcuts({ activeCompanyId: 2, companies, role: "buyer", roles }), {
    companyId: 2,
    companyName: "Example Fuels",
    buyer: true,
    seller: true,
  });
  assert.deepEqual(companyDraftShortcuts({ activeCompanyId: 3, companies, role: "buyer", roles }), {
    companyId: 3,
    companyName: "Company 3",
    buyer: true,
    seller: false,
  });
  assert.deepEqual(companyDraftShortcuts({ activeCompanyId: 1, companies, role: "buyer", roles }), {
    companyId: 1,
    companyName: "Company 1",
    buyer: false,
    seller: true,
  });
});

test("a role the account does not hold is never offered", () => {
  const companies = [membership(2, "both")];
  assert.deepEqual(companyDraftShortcuts({ activeCompanyId: 2, companies, role: "buyer", roles: ["buyer"] }), {
    companyId: 2,
    companyName: "Company 2",
    buyer: true,
    seller: false,
  });
  assert.equal(companyDraftShortcuts({ activeCompanyId: 2, companies, role: "admin", roles: ["admin"] }), null);
});

test("unknown or missing active membership fails closed", () => {
  const companies = [membership(1, "both")];
  assert.equal(companyDraftShortcuts(null), null);
  assert.equal(companyDraftShortcuts({ companies, role: "buyer", roles: ["buyer", "seller"] }), null);
  assert.equal(companyDraftShortcuts({ activeCompanyId: 9, companies, role: "buyer", roles: ["buyer", "seller"] }), null);
  assert.equal(companyDraftShortcuts({ activeCompanyId: 1, role: "buyer", roles: ["buyer"] }), null);
  assert.equal(
    companyDraftShortcuts({ activeCompanyId: 1, companies: [membership(1, "lab")], role: "buyer", roles: ["buyer", "seller"] }),
    null,
  );
});

test("draft destinations use the explicit status filter", () => {
  assert.equal(BUYER_DRAFTS_HREF, "/buyer/rfq?status=draft");
  assert.equal(SELLER_DRAFTS_HREF, "/seller/listings?status=draft");
  assert.equal(isDraftStatusParam("draft"), true);
  for (const value of [null, undefined, "", "Draft", "open", "all"]) assert.equal(isDraftStatusParam(value), false);
});

test("seller draft view keeps only draft listings", () => {
  const listings = ["published", "draft", "closed", "pending_review", "draft", "paused"].map((statusCode, id) => ({ id, statusCode }));
  assert.deepEqual(draftListingsOnly(listings).map((l) => l.id), [1, 4]);
  assert.deepEqual(draftListingsOnly([]), []);
});

test("toggling the draft filter keeps other query parameters", () => {
  assert.equal(withDraftStatusParam("", true), "?status=draft");
  assert.equal(withDraftStatusParam("status=draft", false), "");
  assert.equal(withDraftStatusParam("view=card&status=draft", false), "?view=card");
  assert.equal(withDraftStatusParam("view=card", true), "?view=card&status=draft");
});

test("a role switch is needed unless the session already acts in the target role", () => {
  assert.equal(needsRoleSwitch("buyer", "buyer"), false);
  assert.equal(needsRoleSwitch("seller", "seller"), false);
  assert.equal(needsRoleSwitch("seller", "buyer"), true);
  assert.equal(needsRoleSwitch("buyer", "seller"), true);
  assert.equal(needsRoleSwitch("admin", "buyer"), true);
  assert.equal(needsRoleSwitch(undefined, "seller"), true);
  assert.equal(DRAFT_SHORTCUT_HREF.buyer, BUYER_DRAFTS_HREF);
  assert.equal(DRAFT_SHORTCUT_HREF.seller, SELLER_DRAFTS_HREF);
});

test("navigation requires the raw session to keep the same company in the target role", () => {
  for (const target of ["buyer", "seller"] as const) {
    const other = target === "buyer" ? "seller" : "buyer";
    assert.equal(isRoleSwitchVerified(2, target, { activeCompanyId: 2, activeRoleCode: target }), true);
    assert.equal(isRoleSwitchVerified(2, target, { activeCompanyId: 1, activeRoleCode: target }), false);
    assert.equal(isRoleSwitchVerified(2, target, { activeCompanyId: 2, activeRoleCode: other }), false);
    assert.equal(isRoleSwitchVerified(2, target, { activeCompanyId: 2, activeRoleCode: "admin" }), false);
    assert.equal(isRoleSwitchVerified(2, target, { activeCompanyId: 2 }), false);
    assert.equal(isRoleSwitchVerified(2, target, { activeRoleCode: target }), false);
    assert.equal(isRoleSwitchVerified(2, target, null), false);
  }
});
