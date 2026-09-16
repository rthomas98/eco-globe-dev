import test from "node:test";
import assert from "node:assert/strict";
import {
  paymentReceiptHtml,
  paymentsCsv,
  type PaymentDocument,
} from "./payment-documents";
const payment: PaymentDocument = {
  id: 5,
  orderId: 8,
  title: "<script>alert(1)</script>",
  payer: '=HYPERLINK("bad")',
  payee: "Seller",
  amount: 400,
  currency: "USD",
  status: "captured",
  type: "escrow_funding",
  reference: null,
  createdAt: "2026-09-16",
  escrowId: 2,
};
test("receipts escape untrusted data and preserve recorded amounts", () => {
  const html = paymentReceiptHtml(payment);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("USD 400.00"));
  assert.ok(html.includes("Payment receipt"));
  assert.ok(!html.includes("402.00"));
});
test("uncaptured records cannot claim paid receipt", () => {
  const html = paymentReceiptHtml({ ...payment, status: "failed" });
  assert.ok(html.includes("Payment record"));
  assert.ok(!html.includes("Payment receipt"));
});
test("CSV protects spreadsheet formulas and quotes", () => {
  const csv = paymentsCsv([payment]);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"400","USD","captured"'));
});
