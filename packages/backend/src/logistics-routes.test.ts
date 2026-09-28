import assert from "node:assert/strict";
import test from "node:test";
import { authorizeLogistics } from "./logistics-routes.js";
import { ApiError } from "./http.js";

const order = {
  id: 1,
  buyerCompanyId: 42,
  sellerCompanyId: 43,
  status: "in_progress",
  currencyCode: "USD",
  shippingTypeCode: "delivery",
};
test("logistics actions follow active company, including a user belonging to both parties", () => {
  const buyer = { userId: 42, companyId: 42, isAdmin: false };
  const seller = { ...buyer, companyId: 43 };
  authorizeLogistics(buyer, order, "buyer");
  authorizeLogistics(seller, order, "seller");
  for (const [auth, role] of [
    [buyer, "seller"],
    [seller, "buyer"],
    [{ ...buyer, companyId: 99 }, "participant"],
    [{ ...buyer, companyId: undefined }, "participant"],
  ] as const) {
    assert.throws(
      () => authorizeLogistics(auth, order, role),
      (error: unknown) => error instanceof ApiError && error.status === 403,
    );
  }
});
test("staff may coordinate logistics but cannot impersonate buyer approval or receipt", () => {
  const admin = { userId: 1, companyId: 42, isAdmin: true };
  authorizeLogistics(admin, order, "seller");
  authorizeLogistics(admin, order, "participant");
  assert.throws(
    () => authorizeLogistics(admin, order, "buyer"),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
});
