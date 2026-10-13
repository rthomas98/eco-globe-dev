import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKET_RECORD_IMPORT_DEADLINE_MS, isMarketRecordImportWrite } from "./market-record-proxy.ts";

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
