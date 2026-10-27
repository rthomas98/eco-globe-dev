import { test } from "node:test";
import assert from "node:assert/strict";
import { activeMembership, purchaseBlock, purchaseBlockMessage, type PurchaseContext } from "./purchase-eligibility.ts";

const owner = { companyTypeCode: "buyer", memberRoleCode: "owner", canExecuteTransactions: false };
const buyer: PurchaseContext = {
  signedIn: true,
  membership: owner,
  roles: ["buyer"],
  ownListing: false,
  unitPrice: 500,
  currencyCode: "USD",
  hasSds: true,
  quantity: 3,
  available: 103,
};

test("a buyer-company owner can purchase a priced USD listing with an SDS", () => {
  assert.equal(purchaseBlock(buyer), null);
  assert.equal(purchaseBlock({ ...buyer, membership: { ...owner, companyTypeCode: "both", memberRoleCode: "admin" } }), null);
});

test("the active company must be a buyer company, whatever other roles the account holds", () => {
  assert.equal(purchaseBlock({ ...buyer, membership: { ...owner, companyTypeCode: "seller" }, roles: ["seller", "buyer"] }), "not-buyer");
});

test("operators and viewers need execute permission, as backend requireBuyer does", () => {
  const viewer = { companyTypeCode: "buyer", memberRoleCode: "viewer", canExecuteTransactions: false };
  assert.equal(purchaseBlock({ ...buyer, membership: viewer }), "no-permission");
  assert.equal(purchaseBlock({ ...buyer, membership: { ...viewer, memberRoleCode: "buyer_operator", canExecuteTransactions: true } }), null);
});

test("sessions without membership details fall back to the account roles", () => {
  assert.equal(purchaseBlock({ ...buyer, membership: null }), null);
  assert.equal(purchaseBlock({ ...buyer, membership: null, roles: ["seller"] }), "not-buyer");
});

test("each listing rule is reported before checkout starts", () => {
  assert.equal(purchaseBlock({ ...buyer, signedIn: false }), "sign-in");
  assert.equal(purchaseBlock({ ...buyer, ownListing: true }), "own-listing");
  assert.equal(purchaseBlock({ ...buyer, unitPrice: null }), "no-price");
  assert.equal(purchaseBlock({ ...buyer, currencyCode: "EUR" }), "currency");
  assert.equal(purchaseBlock({ ...buyer, currencyCode: "usd" }), null);
  assert.equal(purchaseBlock({ ...buyer, hasSds: false }), "no-sds");
});

test("stock is checked against the resulting line quantity, including what is already in the cart", () => {
  assert.equal(purchaseBlock({ ...buyer, quantity: 103 }), null);
  assert.equal(purchaseBlock({ ...buyer, quantity: 104 }), "exceeds-stock");
  assert.equal(purchaseBlock({ ...buyer, quantity: 1_000_000, available: null }), null);
});

test("totals below the USD 0.50 checkout minimum are blocked at the rounded-cent boundary", () => {
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0 }), "below-minimum");
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0.1, quantity: 4 }), "below-minimum");
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0.1, quantity: 5 }), null);
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0.249, quantity: 2 }), null); // 49.8¢ rounds to 50¢
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0.0024, quantity: 200 }), "below-minimum"); // 48¢
  assert.equal(purchaseBlock({ ...buyer, available: null, unitPrice: 0.0025, quantity: 199 }), null);
});

test("activeMembership picks the session's active company only", () => {
  const companies = [{ id: 1, ...owner, companyTypeCode: "seller" }, { id: 2, ...owner }];
  assert.equal(activeMembership(companies, 2)?.companyTypeCode, "buyer");
  assert.equal(activeMembership(companies, 3), null);
  assert.equal(activeMembership(undefined, 2), null);
});

test("messages exist only for blocks the product pages do not already explain", () => {
  for (const block of ["not-buyer", "no-permission", "own-listing", "currency", "below-minimum"] as const) {
    assert.ok(purchaseBlockMessage(block));
  }
  for (const block of ["sign-in", "no-price", "no-sds", "exceeds-stock"] as const) {
    assert.equal(purchaseBlockMessage(block), null);
  }
  assert.equal(purchaseBlockMessage(null), null);
});
