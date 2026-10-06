import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import test from "node:test";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { handleApiRoute } from "./api.js";
import { ApiError } from "./http.js";
import { paymentReceiptPdf, type ReceiptPayment } from "./payment-receipt.js";

const payment: ReceiptPayment = {
  id: 9, orderId: 28, escrowId: null, payerCompanyName: "QA Buyer",
  providerPaymentId: "pi_test_receipt_reference", amount: 30, currencyCode: "USD",
  paymentStatusCode: "captured", paymentTypeCode: "buyer_funding", createdAt: "2026-10-06T12:00:00Z",
};
const order = { listingTitle: "TEST ONLY PVC", sellerCompanyName: "QA Seller" };

async function text(pdf: PDFDocument) {
  return pdf.context.enumerateIndirectObjects().flatMap(([, object]) => {
    if (!(object instanceof PDFRawStream)) return [];
    const stream = Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    return [...stream.matchAll(/<([a-f0-9]+)>/gi)].map((match) => Buffer.from(match[1]!, "hex").toString("latin1"));
  }).join("\n");
}

test("downloaded PDF preserves actual payment facts and never claims seller payout", async () => {
  const pdf = await PDFDocument.load(await paymentReceiptPdf(payment, order));
  assert.equal(pdf.getTitle(), "EcoGlobe Payment receipt TX-9");
  assert.equal(pdf.getPageCount(), 1);
  const content = await text(pdf);
  for (const fact of ["EG-28", "USD 30.00", "pi_test_receipt_reference", "captured", "TEST ONLY PVC", "QA Buyer", "QA Seller", "None recorded", "not a seller payout"])
    assert.ok(content.includes(fact), fact);
});

test("uncaptured payment PDF is a record with explicit missing reference and no paid claim", async () => {
  const pdf = await PDFDocument.load(await paymentReceiptPdf({ ...payment, paymentStatusCode: "pending", providerPaymentId: null }, order));
  assert.equal(pdf.getTitle(), "EcoGlobe Payment record TX-9");
  const content = await text(pdf);
  assert.ok(content.includes("not a paid receipt"));
  assert.ok(content.includes("Provider reference: Not recorded"));
});

test("receipt wraps wide and non-Latin saved text and rejects malformed money/date", async () => {
  const pdf = await PDFDocument.load(await paymentReceiptPdf(payment, { listingTitle: "W".repeat(4000), sellerCompanyName: "QA 東京 Seller" }));
  assert.ok(pdf.getPageCount() > 1);
  assert.ok((await text(pdf)).includes("QA ?? Seller"));
  for (const patch of [{ amount: NaN }, { currencyCode: "bad" }, { createdAt: "not-a-date" }])
    await assert.rejects(paymentReceiptPdf({ ...payment, ...patch }, order));
});

test("receipt endpoint rejects anonymous requests before SQL and never accepts mutation methods", async () => {
  for (const [method, expected] of [["GET", 401], ["POST", 405], ["PATCH", 405]] as const) {
    const request = new IncomingMessage(new Socket());
    request.method = method;
    request.headers = {};
    await assert.rejects(handleApiRoute(request, new ServerResponse(request), new URL("http://127.0.0.1/api/payments/9/receipt")),
      (error: unknown) => error instanceof ApiError && error.status === expected);
    request.destroy();
  }
});
