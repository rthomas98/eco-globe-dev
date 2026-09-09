import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { validateSpecifications, validateUpload, listingForViewer } from "./listing-routes.js";
import { validateOnboardingPreferences } from "./onboarding-preferences.js";
import { ApiError, readJsonBody } from "./http.js";

test("specifications reject impossible dates, reversed availability, arbitrary properties and malformed arrays", () => {
  for (const invalid of [
    { availabilityFrom: "2026-02-30" },
    { availabilityFrom: "2026-12-31", availabilityTo: "2026-01-01" },
    { claims: [42] },
    { additionalSpecs: [{ label: "x", value: "" }] },
    { sellerVerified: true },
    { sameAsCompany: "true" },
  ]) {
    assert.throws(() => validateSpecifications(invalid), ApiError);
  }
  assert.equal(validateSpecifications({ quality: null }).quality, null);
});
test("uploads reject mismatched signatures, remote URLs, invalid base64 and oversized content", () => {
  const upload = {
    fileName: "sds.pdf",
    documentTypeCode: "sds",
    contentType: "application/pdf",
    contentBase64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
  };
  assert.equal(validateUpload(upload).bytes.toString(), "%PDF-1.4\n%%EOF");
  for (const invalid of [
    { ...upload, contentType: "image/png" },
    { ...upload, contentBase64: "!!!!" },
    { ...upload, fileName: "../x.pdf" },
    {
      ...upload,
      contentBase64: undefined,
      fileUrl: "https://example.test/sds.pdf",
    },
    {
      ...upload,
      contentBase64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
    },
  ])
    assert.throws(() => validateUpload(invalid), ApiError);
});
test("Others onboarding interests require a persisted description", () => {
  assert.throws(
    () => validateOnboardingPreferences({ feedstockInterests: ["Others"] }),
    ApiError,
  );
  assert.throws(
    () => validateOnboardingPreferences({ feedstockInterests: [42] }),
    ApiError,
  );
  assert.deepEqual(
    validateOnboardingPreferences({
      feedstockInterests: ["Others"],
      otherFeedstockInterest: "Tar",
    }),
    { interests: ["Others"], other: "Tar" },
  );
});
test("body reader caps accumulated bytes before parsing", async () => {
  const request = Readable.from([
    Buffer.alloc(8 * 1024 * 1024),
    Buffer.from("x"),
  ]);
  await assert.rejects(
    readJsonBody(request as IncomingMessage),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});

test("listing teasers retain region but never disclose gated price, identity or specifications", () => {
  const listing = { id: 7, pricePerUnit: 225, quantity: 234, minimumOrderQuantity: 10, sellerCompanyId: 3, sellerCompanyName: "Private", specifications: { composition: "Private" }, documents: [{ fileUrl: "private" }], location: { city: "Private", stateProvince: "LA", addressLine1: "Private", latitude: 30 } };
  const teaser = listingForViewer(listing);
  assert.equal(listingForViewer({...listing,quantity:null}).quantity,null);
  assert.equal(teaser.pricePerUnit, null);
  assert.equal(teaser.sellerCompanyName, null);
  assert.deepEqual(teaser.specifications, {});
  assert.deepEqual(teaser.documents, []);
  assert.equal(teaser.location.city, null);
  assert.equal(teaser.location.stateProvince, "LA");
});
