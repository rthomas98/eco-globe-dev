import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARKET_RECORD_IMPORT_DEADLINE_MS,
  isLongMarketRecordWrite,
  isMarketRecordImportWrite,
  isMarketReferenceUpload,
} from "./market-record-proxy.ts";

test("only the reference upload POST joins the long deadline; reads and downloads do not", () => {
  const upload = "/api/admin/market-records/references";
  assert.equal(isMarketReferenceUpload(upload, "POST"), true);
  assert.equal(isLongMarketRecordWrite(upload, "POST"), true);
  assert.equal(isLongMarketRecordWrite("/api/admin/market-records/imports/preview", "POST"), true);
  for (const [path, method] of [
    [upload, "GET"],
    [`${upload}/7/download`, "GET"],
    [`${upload}/7/download`, "POST"],
    [`${upload}/`, "POST"],
    [`${upload}?recordId=1`, "POST"],
    ["/api/admin/market-records", "POST"],
    ["/api/admin/market-records/12", "POST"],
  ] as const) {
    assert.equal(isLongMarketRecordWrite(path, method), false, `${method} ${path}`);
  }
});

test("only import preview and commit POSTs get the long proxy deadline", () => {
  assert.equal(MARKET_RECORD_IMPORT_DEADLINE_MS, 60_000);
  assert.equal(isMarketRecordImportWrite("/api/admin/market-records/imports/preview", "POST"), true);
  assert.equal(
    isMarketRecordImportWrite(
      "/api/admin/market-records/imports/3f2b8c1e-7a4d-4e5f-9a1b-2c3d4e5f6a7b/commit",
      "POST",
    ),
    true,
  );
  for (const [path, method] of [
    ["/api/admin/market-records/imports/preview", "GET"],
    ["/api/admin/market-records/imports/3f2b8c1e-7a4d-4e5f-9a1b-2c3d4e5f6a7b", "GET"],
    ["/api/admin/market-records/imports/not-a-uuid/commit", "POST"],
    ["/api/admin/market-records/imports/preview/extra", "POST"],
    ["/api/admin/market-records", "POST"],
    ["/api/admin/market-records/12", "PATCH"],
    ["/api/listing-documents", "POST"],
  ] as const) {
    assert.equal(isMarketRecordImportWrite(path, method), false, `${method} ${path}`);
  }
});
