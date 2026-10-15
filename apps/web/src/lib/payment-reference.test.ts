import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePaymentReference, receiptDownloadPath, receiptPath } from "./payment-documents.ts";
import { paymentCenterCart } from "./payment-center-cart.ts";

test("receipt route accepts the TX-prefixed links the admin portal renders and plain numeric ids", () => {
  // /admin/sales/EG-28 links to /admin/accounting/payments/TX-9.
  assert.equal(parsePaymentReference("TX-9"), 9);
  assert.equal(parsePaymentReference("tx-9"), 9);
  assert.equal(parsePaymentReference("9"), 9);
  assert.equal(parsePaymentReference("TX-128"), 128);
  // Encoded segment as it can arrive from the router.
  assert.equal(parsePaymentReference("TX%2D9"), 9);
});

test("receipt route rejects references that are not one payment id", () => {
  for (const raw of [undefined, "", " ", "TX-", "TX-0", "0", "-9", "TX--9", "TX-9a", "9.5", "ESC-9", "EG-9", "TX-09", "1e3", "TX-9/1", "%E0"])
    assert.equal(parsePaymentReference(raw), null, String(raw));
  assert.equal(parsePaymentReference("9007199254740993"), null);
});

test("receipt page and PDF download paths resolve back to the same saved payment", () => {
  assert.equal(receiptPath("admin", 9), "/admin/accounting/payments/9");
  assert.equal(receiptDownloadPath(9), "/api/backend/api/payments/9/receipt");
  assert.equal(parsePaymentReference(receiptPath("admin", 9).split("/").pop()), 9);
});

test("payments centre works without a cart for staff and sellers and requires the cart for buyers", () => {
  const removed: string[] = [];
  const buyerCart = { items: [{ id: "21" }], removeItem: (id: string) => void removed.push(id) };
  const admin = paymentCenterCart("admin", null);
  assert.deepEqual(admin.items, []);
  admin.removeItem("21");
  // A buyer cart in the same browser is never shown on staff or seller pages.
  assert.deepEqual(paymentCenterCart("admin", buyerCart).items, []);
  assert.deepEqual(paymentCenterCart("seller", buyerCart).items, []);
  // Buyers keep their cart: remaining items and removal after a paid checkout.
  const buyer = paymentCenterCart("buyer", buyerCart);
  assert.deepEqual(buyer.items, [{ id: "21" }]);
  buyer.removeItem("21");
  assert.deepEqual(removed, ["21"]);
  // The buyer portal must keep its CartProvider; a missing one still fails loudly.
  assert.throws(() => paymentCenterCart("buyer", null), /useCart must be used within CartProvider/);
  assert.deepEqual(paymentCenterCart("seller", null).items, []);
});
