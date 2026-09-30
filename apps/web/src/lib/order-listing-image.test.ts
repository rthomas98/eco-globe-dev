import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOrderListingImageUrl } from "./order-listing-image.ts";
import { listingDocumentUrl } from "./api-listing-documents.ts";

const browserSrc = (raw: unknown) => {
  const ref = parseOrderListingImageUrl(raw);
  return ref ? listingDocumentUrl(ref) : "";
};

test("an uploaded photo download path goes through the same-origin backend proxy", () => {
  assert.equal(browserSrc("/api/listing-documents/42/download"), "/api/backend/api/listing-documents/42/download");
  assert.equal(browserSrc(" /api/listing-documents/7/download "), "/api/backend/api/listing-documents/7/download");
  assert.equal(
    browserSrc("/api/backend/api/listing-documents/42/download"),
    "/api/backend/api/listing-documents/42/download",
  );
});

test("a retained legacy https file URL is used as saved", () => {
  const legacy = "https://ecoglobe.blob.core.windows.net/listing-documents/photo.jpg";
  assert.equal(browserSrc(legacy), legacy);
});

test("no saved photo yields no image source", () => {
  for (const value of [null, undefined, "", "   ", 42, {}]) {
    assert.equal(browserSrc(value), "", String(value));
  }
});

test("unexpected or unsafe sources are rejected", () => {
  for (const value of [
    "/api/listing-documents/0/download",
    "/api/listing-documents/abc/download",
    "/api/listing-documents/1/download/../../orders",
    "/api/listing-documents/1",
    "/api/orders/1",
    "/images/materials/wood.jpg",
    "//evil.example/photo.jpg",
    "http://example.com/photo.jpg",
    "https://user:pass@example.com/photo.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "https://example.com/a b.jpg",
    "/api/listing-documents/1/download\\x",
  ]) {
    assert.equal(browserSrc(value), "", value);
  }
});
