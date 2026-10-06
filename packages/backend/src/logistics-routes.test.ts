import assert from "node:assert/strict";
import test from "node:test";
import { authorizeLogistics, requireFundedCheckout } from "./logistics-routes.js";
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

test("historic listing checkout fulfilment requires full captured funding with no zero-total bypass", () => {
  const checkout = { ...order, creationSourceCode: "listing_checkout", totalAmount: 30, capturedFunding: 30 };
  assert.doesNotThrow(() => requireFundedCheckout(checkout));
  for (const patch of [{ capturedFunding: 0 }, { capturedFunding: 29.99 }, { capturedFunding: undefined }, { capturedFunding: NaN }, { totalAmount: 0 }])
    assert.throws(() => requireFundedCheckout({ ...checkout, ...patch }), (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.doesNotThrow(() => requireFundedCheckout({ ...order, creationSourceCode: "admin_direct", totalAmount: 0, capturedFunding: 0 }));
});
