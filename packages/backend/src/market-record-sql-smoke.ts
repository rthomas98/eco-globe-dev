/** Run only in the verified Orca-owned SQL runtime with an existing synthetic admin session.
 * Requires ECOGLOBE_MARKET_SMOKE_EXPECTED_DATABASE=eco_<runtime key> and
 * ECOGLOBE_MARKET_SMOKE_ADMIN_TOKEN in the sanitized runtime environment.
 * Retains synthetic registry fixtures; never reads the private source workbook.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import ExcelJS from "exceljs";
import { queryRowsWithParams, sql } from "./database.js";
import { handleMarketRecordRoute } from "./market-record-routes.js";
import { ApiError, sendJson } from "./http.js";
import { workbookHeaders, XLSX_MIME } from "./market-record-import.js";
import type {
  MarketRecord,
  MarketPreview,
  MarketCommitResult,
  MarketRecordList,
  MarketAuditList,
} from "../../shared/src/market-records-api.js";

const expected = process.env.ECOGLOBE_MARKET_SMOKE_EXPECTED_DATABASE;
const connection =
  process.env.AZURE_SQL_CONNECTION_STRING ??
  process.env.SQL_CONNECTION_STRING ??
  "";
const token = process.env.ECOGLOBE_MARKET_SMOKE_ADMIN_TOKEN;
if (
  !expected ||
  !/^eco_[a-f0-9]{24}$/u.test(expected) ||
  !token ||
  !/^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/u.test(connection)
)
  throw new Error(
    "Refused: use the verified local Orca SQL environment and an existing synthetic admin bearer session; no shared database is allowed.",
  );
const db = await queryRowsWithParams<{ name: string }>("SELECT DB_NAME() name");
assert.equal(db[0]?.name, expected, "Database identity mismatch.");
const counts = () =>
  queryRowsWithParams<Record<string, number>>(
    "SELECT (SELECT COUNT(*) FROM dbo.Companies) companies,(SELECT COUNT(*) FROM dbo.Locations) locations,(SELECT COUNT(*) FROM dbo.Listings) listings,(SELECT COUNT(*) FROM dbo.Users) users,(SELECT COUNT(*) FROM dbo.Orders) orders",
  );
const baseline = await counts();
const server = createServer((req, res) => {
  void handleMarketRecordRoute(
    req,
    res,
    new URL(req.url ?? "/", "http://local"),
  )
    .then((handled) => {
      if (!handled) sendJson(res, 404, { ok: false, error: "Not found" });
    })
    .catch((error) =>
      sendJson(res, error instanceof ApiError ? error.status : 500, {
        ok: false,
        error: "Smoke request failed.",
      }),
    );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("No local listener.");
const base = `http://127.0.0.1:${address.port}/api/admin/market-records`,
  prefix = `Synthetic market smoke ${randomUUID()}`;
const ids: number[] = [];
let assertions = 0;
async function call<T>(
  path: string,
  method = "GET",
  body?: unknown,
  status = 200,
): Promise<T> {
  const raw = Buffer.isBuffer(body);
  const response = await fetch(base + path, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined
        ? {}
        : { "content-type": raw ? XLSX_MIME : "application/json" }),
    },
    body:
      body === undefined
        ? undefined
        : raw
          ? new Uint8Array(body)
          : JSON.stringify(body),
  });
  assert.equal(
    response.status,
    status,
    `Unexpected HTTP status for ${method} ${path}.`,
  );
  assertions++;
  return (await response.json()) as T;
}
async function book(suffix: string, duplicate = false): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheetName of ["Sellers", "Buyers"]) {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(workbookHeaders);
    const row = [
      prefix + suffix,
      "Synthetic facility",
      "1 Test Road",
      "Test",
      "LA",
      "00123",
      "US",
      "Synthetic material",
      "Synthetic group",
      null,
      null,
      null,
      null,
      null,
      "Yes",
      sheetName === "Sellers" ? "Confirmed stream" : "Buyer need",
      "Synthetic citation",
      "Synthetic address source",
    ];
    sheet.addRow(row);
    if (duplicate && sheetName === "Sellers") sheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
const commit = (
  preview: MarketPreview,
  key = randomUUID(),
  excludedRowKeys: string[] = [],
) =>
  call<MarketCommitResult>(`/imports/${preview.previewId}/commit`, "POST", {
    idempotencyKey: key,
    excludedRowKeys,
    reason: "Synthetic isolated SQL acceptance.",
  });
try {
  let { record } = await call<{ record: MarketRecord }>(
    "",
    "POST",
    {
      role: "seller",
      companyName: prefix,
      facilityName: "Synthetic facility",
      feedstock: "Synthetic manual feedstock",
      sourceRecordType: "confirmed_stream",
      sourceChecked: true,
      address: {
        street: "1 Test Road",
        city: "Test",
        postalCode: "00123",
        countryCode: "US",
        purpose: "unknown",
      },
      price: {
        value: "0",
        currencyCode: "USD",
        perUnit: "t",
        citation: "Synthetic source",
      },
      volume: { value: "12", unit: "t", period: "annual" },
    },
    201,
  );
  ids.push(record.id);
  assert.equal(record.sourceCheckedBy, null);
  assert.equal(record.price.status, "unknown");
  const stale = record.version;
  ({ record } = await call<{ record: MarketRecord }>(
    `/${record.id}/confirmations/price`,
    "POST",
    {
      expectedVersion: record.version,
      status: "confirmed",
      citation: "Synthetic staff review",
      reason: "Synthetic review.",
    },
  ));
  assert.equal(record.price.status, "confirmed");
  assert.ok(record.price.reviewedByUserId);
  assert.ok(record.price.reviewedAt);
  await call(
    `/${record.id}`,
    "PATCH",
    {
      expectedVersion: stale,
      reason: "Stale edit.",
      changes: { companyName: "Should not save" },
    },
    409,
  );
  ({ record } = await call<{ record: MarketRecord }>(`/${record.id}`, "PATCH", {
    expectedVersion: record.version,
    reason: "Change reviewed value.",
    changes: {
      price: {
        value: "-5",
        currencyCode: "USD",
        perUnit: "t",
        citation: "Synthetic gate fee",
      },
    },
  }));
  assert.equal(record.price.status, "unknown");
  ({ record } = await call<{ record: MarketRecord }>(
    `/${record.id}/archive`,
    "POST",
    { expectedVersion: record.version, reason: "Archive synthetic fixture." },
  ));
  assert.equal(record.status, "archived");
  ({ record } = await call<{ record: MarketRecord }>(
    `/${record.id}/restore`,
    "POST",
    { expectedVersion: record.version, reason: "Restore synthetic fixture." },
  ));
  assert.equal(record.status, "active");
  const history = await call<MarketAuditList>(`/${record.id}/audit`);
  assert.ok(history.events.length >= 5);
  assert.ok(
    history.events.every((e) => e.actorUserId === record.updatedByUserId),
  );
  const bytes = await book(" import"),
    preview = await call<MarketPreview>("/imports/preview", "POST", bytes, 201),
    key = randomUUID();
  assert.equal(
    (await call<MarketPreview>(`/imports/${preview.previewId}`)).previewId,
    preview.previewId,
  );
  const [first, replay] = await Promise.all([
    commit(preview, key),
    commit(preview, key),
  ]);
  assert.deepEqual(first, replay);
  assert.equal(first.totals.created, 2);
  ids.push(...first.createdIds);
  assert.deepEqual(
    (await call<MarketPreview>(`/imports/${preview.previewId}`)).result,
    first,
  );
  await call(
    `/imports/${preview.previewId}/commit`,
    "POST",
    { idempotencyKey: key, excludedRowKeys: [], reason: "Different intent" },
    409,
  );
  let imported = (
    await call<{ record: MarketRecord }>(`/${first.createdIds[0]}`)
  ).record;
  imported = (
    await call<{ record: MarketRecord }>(`/${imported.id}`, "PATCH", {
      expectedVersion: imported.version,
      reason: "Edit imported identity.",
      changes: { companyName: prefix + " edited identity" },
    })
  ).record;
  imported = (
    await call<{ record: MarketRecord }>(`/${imported.id}/archive`, "POST", {
      expectedVersion: imported.version,
      reason: "Archive imported identity.",
    })
  ).record;
  const again = await call<MarketPreview>(
    "/imports/preview",
    "POST",
    bytes,
    201,
  );
  assert.equal(imported.status, "archived");
  assert.equal(again.totals.duplicateRows, 2);
  assert.equal((await commit(again)).totals.created, 0);
  const simultaneous = await book(" concurrent"),
    p1 = await call<MarketPreview>(
      "/imports/preview",
      "POST",
      simultaneous,
      201,
    ),
    p2 = await call<MarketPreview>(
      "/imports/preview",
      "POST",
      simultaneous,
      201,
    );
  const outcomes = await Promise.all([commit(p1), commit(p2)]);
  assert.equal(
    outcomes.reduce((n, r) => n + r.totals.created, 0),
    2,
  );
  for (const result of outcomes) ids.push(...result.createdIds);
  const duplicates = await call<MarketPreview>(
    "/imports/preview",
    "POST",
    await book(" exclude-original", true),
    201,
  );
  const original = duplicates.rows.find(
    (r) => r.sheet === "Sellers" && r.decision === "create",
  )!;
  assert.ok(original);
  const exclusion = await commit(duplicates, randomUUID(), [original.rowKey]);
  assert.equal(exclusion.totals.created, 1);
  assert.equal(exclusion.totals.duplicates, 1);
  ids.push(...exclusion.createdIds);
  // Fault injection only into this new synthetic preview: second insert fails a SQL CHECK.
  const rollback = await call<MarketPreview>(
    "/imports/preview",
    "POST",
    await book(" rollback"),
    201,
  );
  const corrupted = structuredClone(rollback);
  corrupted.rows[1]!.proposedRecord!.volume.value = "-1";
  corrupted.rows[1]!.proposedRecord!.volume.unit = "t";
  await queryRowsWithParams(
    "UPDATE dbo.MarketRecordImports SET PayloadJson=@payload WHERE PreviewId=@id",
    [
      {
        name: "payload",
        type: sql.NVarChar(sql.MAX),
        value: JSON.stringify(corrupted),
      },
      { name: "id", type: sql.UniqueIdentifier, value: rollback.previewId },
    ],
  );
  const before = (
    await queryRowsWithParams<{ count: number }>(
      "SELECT COUNT(*) count FROM dbo.MarketRecords",
    )
  )[0]?.count;
  await call(
    `/imports/${rollback.previewId}/commit`,
    "POST",
    {
      idempotencyKey: randomUUID(),
      excludedRowKeys: [],
      reason: "Synthetic rollback fault.",
    },
    500,
  );
  assert.equal(
    (
      await queryRowsWithParams<{ count: number }>(
        "SELECT COUNT(*) count FROM dbo.MarketRecords",
      )
    )[0]?.count,
    before,
  );
  assert.equal(
    (await call<MarketPreview>(`/imports/${rollback.previewId}`)).state,
    "preview",
  );
  const expired = await call<MarketPreview>(
    "/imports/preview",
    "POST",
    await book(" expiry"),
    201,
  );
  await queryRowsWithParams(
    "UPDATE dbo.MarketRecordImports SET ExpiresAt=DATEADD(MINUTE,-1,SYSUTCDATETIME()) WHERE PreviewId=@id",
    [{ name: "id", type: sql.UniqueIdentifier, value: expired.previewId }],
  );
  await call(`/imports/${expired.previewId}`, "GET", undefined, 410);
  const list = await call<MarketRecordList>(
    `?status=all&search=${encodeURIComponent(prefix)}&limit=200`,
  );
  assert.ok(list.total >= ids.length);
  assert.deepEqual(
    await counts(),
    baseline,
    "Import or CRUD mutated existing account/marketplace tables.",
  );
  console.log(
    JSON.stringify({
      ok: true,
      assertions,
      retainedSyntheticRecordIds: ids,
      checks: [
        "CRUD",
        "reviews",
        "stale-edit",
        "archive-restore",
        "audit",
        "immutable-preview",
        "same-key-concurrency",
        "idempotent-replay",
        "different-intent-conflict",
        "historical-alias-after-edit-and-archive",
        "cross-preview-concurrency",
        "excluded-original-duplicate-stays-skipped",
        "atomic-rollback",
        "preview-expiry",
        "existing-tables-unchanged",
      ],
    }),
  );
} finally {
  server.close();
  await once(server, "close");
  await (await sql.connect(connection)).close();
}
