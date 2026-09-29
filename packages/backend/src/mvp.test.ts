import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { validateCompanyDocument, validateContact } from "./mvp-routes.js";
import { validateCheckout, assertSessionMatches } from "./checkout-routes.js";
test("document upload validates real PDF bytes and rejects active content formats, bad base64 and unsafe names", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const encoded = Buffer.from(await pdf.save()).toString("base64");
  const valid = {
    fileName: "evidence.pdf",
    contentType: "application/pdf",
    contentBase64: encoded,
    category: "verification_business",
  };
  const parsed = await validateCompanyDocument(valid);
  assert.ok(parsed.bytes.length > 100);
  assert.equal(parsed.category, "verification_business");
  for (const patch of [
    { fileName: "../evidence.pdf" },
    { contentType: "text/html" },
    { contentBase64: "!!!!" },
    { contentBase64: Buffer.from("%PDF-pretend").toString("base64") },
    { category: "<script>" },
  ])
    await assert.rejects(validateCompanyDocument({ ...valid, ...patch }));
});
test("contact submission validates bounded data before persistence", () => {
  assert.equal(
    validateContact({
      name: " Test ",
      email: "TEST@example.com",
      topic: "Supply",
      message: "Please contact me",
    }).email,
    "test@example.com",
  );
  assert.throws(() =>
    validateContact({
      name: "Test",
      email: "bad",
      topic: "Supply",
      message: "Hello",
    }),
  );
  assert.throws(() =>
    validateContact({
      name: "Test",
      email: "test@example.com",
      topic: "Supply",
      message: "x".repeat(4001),
    }),
  );
});
test("checkout rejects ambiguous retries, invalid quantities and missing delivery address", () => {
  const body = {
    listingId: 1,
    quantity: 2.5,
    idempotencyKey: "checkout-1234567890",
    deliveryMethod: "pickup",
  };
  assert.equal(validateCheckout(body).quantity, 2.5);
  for (const patch of [
    { quantity: 0 },
    { quantity: NaN },
    { quantity: 0.0001 },
    { listingId: "1" },
    { idempotencyKey: "short" },
    { deliveryMethod: "delivery" },
    { deliveryMethod: "teleport" },
  ])
    assert.throws(() => validateCheckout({ ...body, ...patch }));
});
test("provider reconciliation binds session, amount, currency and mode", () => {
  const attempt = {
    providerSessionId: "cs_test_1",
    amountCents: 1234,
    currencyCode: "USD",
    livemode: false,
  };
  const session = {
    id: "cs_test_1",
    amount_total: 1234,
    currency: "usd",
    livemode: false,
    mode: "payment" as const,
  };
  assert.doesNotThrow(() => assertSessionMatches(attempt, session));
  for (const patch of [
    { id: "cs_other" },
    { amount_total: 1233 },
    { currency: "eur" },
    { livemode: true },
    { mode: "setup" as const },
  ])
    assert.throws(() =>
      assertSessionMatches(attempt, { ...session, ...patch }),
    );
});
