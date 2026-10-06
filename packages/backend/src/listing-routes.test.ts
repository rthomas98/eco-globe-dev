import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createServer, type IncomingMessage } from "node:http";
import { once } from "node:events";
import { validateSpecifications, validateUpload, listingForViewer, handleListingRoute } from "./listing-routes.js";
import { validateOnboardingPreferences } from "./onboarding-preferences.js";
import { ApiError, readJsonBody } from "./http.js";
import { parseListingRadius, withinListingRadius } from "./listing-radius.js";
import { validateLocationFields } from "./location-validation.js";

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

test("anonymous teasers retain the saved public photo URL while documents stay gated", () => {
  const listing = { id: 7, listingImageUrl: "/api/listing-documents/42/download", documents: [{ documentTypeCode: "sds", fileUrl: "private" }], location: { postalCode: "70801", longitude: -91 } };
  const teaser = listingForViewer(listing);
  assert.equal(teaser.listingImageUrl, listing.listingImageUrl);
  assert.deepEqual(teaser.documents, []);
  assert.equal(teaser.location.postalCode, null);
  assert.equal(teaser.location.longitude, null);
  assert.equal(listingForViewer({ ...listing, listingImageUrl: null }).listingImageUrl, null);
});

test("radius excludes distant and unlocated feedstocks and handles zero and dateline coordinates", () => {
  const origin = parseListingRadius(new URLSearchParams({ latitude: "30.4524", longitude: "-91.2103", radiusMiles: "2" }))!;
  assert.equal(withinListingRadius(30.4524, -91.2103, origin), true);
  assert.equal(withinListingRadius(29.7604, -95.3698, origin), false);
  assert.equal(withinListingRadius(51.9244, 4.4777, origin), false);
  assert.equal(withinListingRadius(null, null, origin), false);
  assert.equal(withinListingRadius(0, -179.99, { latitude: 0, longitude: 179.99, radiusMiles: 2 }), true);
  assert.equal(parseListingRadius(new URLSearchParams()), null);
  for (const query of ["radiusMiles=2", "latitude=&longitude=0&radiusMiles=2", "latitude=91&longitude=0&radiusMiles=2", "latitude=0&longitude=181&radiusMiles=2", "latitude=0&longitude=0&radiusMiles=Infinity", "latitude=0&longitude=0&radiusMiles=0"])
    assert.throws(() => parseListingRadius(new URLSearchParams(query)), ApiError);
});

test("anonymous radius probes are denied before private SQL coordinates can be inferred", async () => {
  const server = createServer(async (request, response) => {
    try {
      await handleListingRoute(request, response, new URL(request.url!, "http://127.0.0.1"));
    } catch (error) {
      response.writeHead(error instanceof ApiError ? error.status : 500);
      response.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/listings?latitude=30&longitude=-91&radiusMiles=2`);
    assert.equal(response.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("facility validation preserves full address and clears stale coordinates when address is edited", () => {
  const address = { name: "Facility", addressLine1: "4801 Riverside Dr", city: "Baton Rouge", stateProvince: "LA", postalCode: "70801", countryCode: "us", latitude: 30.4524, longitude: -91.2103 };
  assert.equal(validateLocationFields(address).postalCode, "70801");
  assert.equal(validateLocationFields(address).countryCode, "US");
  assert.equal(validateLocationFields({ postalCode: "70801" }, true).latitude, null);
  assert.equal(validateLocationFields({ name: "New name" }, true).latitude, undefined);
  assert.equal(validateLocationFields({ latitude: null, longitude: null }, true).longitude, null);
  for (const patch of [{ latitude: 91, longitude: 0 }, { latitude: 0 }, { latitude: null, longitude: 0 }, { latitude: "30", longitude: -91 }, { countryCode: "1!" }, { name: null }])
    assert.throws(() => validateLocationFields(patch, true), ApiError);
});
