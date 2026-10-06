import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentDocumentFrom, receiptPath, receiptTitle, type SavedPaymentRow } from "./payment-documents.ts";

const saved: SavedPaymentRow = {
  id: 9,
  orderId: 28,
  escrowId: null,
  payerCompanyName: "Bianca Buyer Co",
  providerPaymentId: " pi_3Test ",
  amount: "30.00",
  currencyCode: "USD",
  paymentStatusCode: "captured",
  paymentTypeCode: "buyer_funding",
  createdAt: "2026-10-06T15:00:00Z",
};

test("receipt content comes from the saved payment and order", () => {
  const doc = paymentDocumentFrom(saved, { listingTitle: "PVC Scrap", sellerCompanyName: "MKDK Shop" });
  assert.equal(doc.amount, 30);
  assert.equal(doc.reference, "pi_3Test");
  assert.equal(doc.title, "PVC Scrap");
  assert.equal(doc.payee, "MKDK Shop");
  assert.equal(receiptTitle(doc), "Payment receipt TX-9");
});

test("missing order or provider data is never invented", () => {
  const doc = paymentDocumentFrom({ ...saved, providerPaymentId: "  " }, null);
  assert.equal(doc.reference, null);
  assert.equal(doc.payee, "Not recorded");
  assert.equal(doc.title, "Marketplace payment");
});

test("only captured payments are titled as receipts", () => {
  for (const status of ["pending", "failed", "refunded", "authorized"])
    assert.equal(receiptTitle({ id: 9, status }), "Payment record TX-9");
  assert.equal(receiptPath("buyer", 9), "/buyer/accounting/payments/9");
  assert.equal(receiptPath("seller", 9), "/seller/accounting/payments/9");
});
