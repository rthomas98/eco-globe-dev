import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { createServer, type IncomingMessage } from "node:http";
import { once } from "node:events";
import ExcelJS from "exceljs";
import sql from "mssql";
// A non-routable synthetic configuration; all SQL calls below are driver-stubbed.
process.env.AZURE_SQL_CONNECTION_STRING = process.env.SQL_CONNECTION_STRING =
  "Server=127.0.0.1,1;Database=synthetic_listing_import_tests;User Id=synthetic;Password=synthetic";
const { listingImportTemplate, parseListingXlsx, listingImportHeaders } =
  await import("./listing-import-workbook.js");
const { validateListingImportRows, revalidateListingImport } =
  await import("./listing-import-validation.js");
const { createListingImportHandler, listingImportCompanyId } =
  await import("./listing-import-routes.js");
const store = await import("./listing-import-store.js");
const { ApiError } = await import("./http.js");
const { XLSX_MIME } = await import("./market-record-import.js");
const { DEMO_ESTIMATE_MARKER } =
  await import("../../shared/src/demo-estimates.mjs");
const refs = {
  sellerCompanyName: "Synthetic seller",
  materials: [{ id: 1, code: "wood", label: "Wood chips" }],
  locations: [{ id: 7, name: "Mill" }],
  existingTitles: [] as string[],
};
const cells = () => [
  "Wood lot",
  "Wood chips",
  1200.125,
  "t",
  1.5,
  "$1,234.50",
  "usd",
  " mill ",
  "Clean chips",
  4.125,
  "2026-10-01",
  "2026-12-31",
];
const validate = (values: unknown[] = cells(), references = refs) =>
  validateListingImportRows(
    [
      {
        rowNumber: 2,
        cells: values as Parameters<
          typeof validateListingImportRows
        >[0][number]["cells"],
      },
    ],
    references,
  )[0]!;
async function workbook(rows: unknown[][], headers = listingImportHeaders) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Listings");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
}
const status = (code: number) => (error: unknown) =>
  error instanceof ApiError && error.status === code;

test("template round trip: exact sheets, headers, 500 dropdown rows, real dates and parsed values", async () => {
  const bytes = await listingImportTemplate(refs);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(bytes).buffer);
  assert.deepEqual(
    book.worksheets.map((s) => s.name),
    ["Listings", "Instructions", "Lists"],
  );
  const sheet = book.getWorksheet("Listings")!;
  assert.equal(sheet.getCell("B501").dataValidation.type, "list");
  assert.equal(
    sheet.getCell("G2").dataValidation.formulae?.[0],
    "ListingImportCurrencies",
  );
  sheet.getRow(2).values = cells();
  sheet.getCell("K2").value = new Date("2026-10-01T00:00:00Z");
  const rows = await parseListingXlsx(
    Buffer.from(await book.xlsx.writeBuffer()),
  );
  assert.equal(rows.length, 1);
  const row = validateListingImportRows(rows, refs)[0]!;
  assert.equal(row.status, "ready");
  assert.equal(row.listing.quantityUnit, "tonnes");
  assert.equal(row.listing.locationId, 7);
  assert.equal(row.listing.pricePerUnit, 1234.5);
  assert.equal(row.listing.availabilityFrom, "2026-10-01");
  assert.equal(revalidateListingImport(row.listing, refs).sameAsCompany, false);
});
test("workbook rejects header mismatch (naming all headers), missing sheet, empty and over 500 rows", async () => {
  await assert.rejects(
    parseListingXlsx(
      await workbook([cells()], ["Renamed", ...listingImportHeaders.slice(1)]),
    ),
    (error: unknown) =>
      status(400)(error) &&
      listingImportHeaders.every((h) => (error as Error).message.includes(h)),
  );
  const book = new ExcelJS.Workbook();
  book.addWorksheet("Renamed").addRow(listingImportHeaders);
  await assert.rejects(
    parseListingXlsx(Buffer.from(await book.xlsx.writeBuffer())),
    status(400),
  );
  await assert.rejects(parseListingXlsx(await workbook([])), status(400));
  await assert.rejects(
    parseListingXlsx(await workbook(Array.from({ length: 501 }, cells))),
    status(400),
  );
});
test("blank rows are skipped while spreadsheet row numbers are retained", async () => {
  const rows = await parseListingXlsx(
    await workbook([[], cells(), [], [" ", " "]]),
  );
  assert.deepEqual(
    rows.map((r) => r.rowNumber),
    [3],
  );
});
test("unsafe formulas, external hyperlinks, corrupt bytes and oversize uploads are rejected", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Listings");
  sheet.addRow(listingImportHeaders);
  sheet.addRow(cells());
  sheet.getCell("A2").value = { formula: "1+1", result: 2 };
  await assert.rejects(
    parseListingXlsx(Buffer.from(await book.xlsx.writeBuffer())),
    status(400),
  );
  sheet.getCell("A2").value = {
    text: "Wood lot",
    hyperlink: "https://example.test/",
  };
  await assert.rejects(
    parseListingXlsx(Buffer.from(await book.xlsx.writeBuffer())),
    status(400),
  );
  await assert.rejects(parseListingXlsx(Buffer.from("bad")), status(400));
  await assert.rejects(
    parseListingXlsx(Buffer.alloc(2 * 1024 * 1024 + 1)),
    status(413),
  );
});
test("material labels/codes, facilities and units match case-insensitively", () => {
  for (const material of ["WOOD", " wood chips "]) {
    const row = cells();
    row[1] = material;
    assert.equal(validate(row).listing.materialTypeCode, "wood");
    assert.equal(validate(row).status, "ready");
  }
  for (const unit of [
    "TON",
    "tons",
    "tonne",
    "tonnes",
    "kg",
    "LB",
    "unit",
    "units",
    "T",
  ]) {
    const row = cells();
    row[3] = unit;
    assert.equal(validate(row).status, "ready");
  }
  assert.equal(
    validate(cells(), {
      ...refs,
      locations: [...refs.locations, { id: 8, name: " mill " }],
    }).status,
    "error",
  );
  assert.match(
    validate(cells(), {
      ...refs,
      locations: [...refs.locations, { id: 8, name: " mill " }],
    }).diagnostics[0]!.message,
    /Rename/,
  );
});
test("all blocking validation rules report the exact column header", () => {
  const cases: Array<[number, unknown]> = [
    [0, null],
    [0, "x".repeat(201)],
    [1, null],
    [1, "unknown"],
    [2, "no"],
    [2, 0],
    [2, -1],
    [2, 1.1234],
    [3, "gallon"],
    [4, 0],
    [4, -1],
    [4, 2000],
    [4, 1.1234],
    [5, 0],
    [5, -1],
    [5, 1.001],
    [5, "1,2"],
    [5, "Infinity"],
    [6, "US"],
    [6, "123"],
    [7, "unknown"],
    [8, "x".repeat(10001)],
    [8, DEMO_ESTIMATE_MARKER + " price"],
    [9, -1],
    [9, "bad"],
    [9, 1.1234],
    [10, "2026-02-30"],
    [10, "not-date"],
    [11, "2026-09-30"],
  ];
  for (const [i, value] of cases) {
    const row = cells() as unknown[];
    row[i] = value;
    const result = validate(row);
    assert.equal(
      result.status,
      "error",
      `column ${i}: ${String(value).slice(0, 30)}`,
    );
    assert.ok(
      result.diagnostics.some(
        (d) => d.severity === "error" && d.field === listingImportHeaders[i],
      ),
    );
  }
});
test("missing submission fields, non-USD and duplicate titles warn without blocking drafts", () => {
  for (const i of [2, 3, 4, 5, 6, 7]) {
    const row = cells() as unknown[];
    row[i] = null;
    const result = validate(row);
    assert.equal(result.status, "warning");
    assert.ok(
      result.diagnostics.some(
        (d) =>
          d.field === listingImportHeaders[i] &&
          d.message ===
            "Needed before this listing can be submitted for review.",
      ),
    );
  }
  const nonUsd = cells();
  nonUsd[6] = "eur";
  assert.equal(
    validate(nonUsd).diagnostics[0]!.message,
    "Online checkout supports USD only; buyers will need to request a quote.",
  );
  const duplicate = validateListingImportRows(
    [
      { rowNumber: 2, cells: cells() },
      { rowNumber: 3, cells: ["WOOD LOT", ...cells().slice(1)] },
    ],
    refs,
  );
  assert.ok(duplicate.every((r) => r.status === "warning"));
  assert.equal(
    validate(cells(), { ...refs, existingTitles: ["wood LOT"] }).status,
    "warning",
  );
  const row = cells();
  row[2] = "1,200.125";
  assert.equal(validate(row).listing.quantity, 1200.125);
});
test("revalidation rejects removed materials, transferred facilities, dates and invalid canonical values", () => {
  const row = validate().listing;
  assert.throws(
    () => revalidateListingImport(row, { ...refs, materials: [] }),
    status(409),
  );
  assert.throws(
    () => revalidateListingImport(row, { ...refs, locations: [] }),
    status(409),
  );
  for (const patch of [
    { quantity: 0 },
    { quantityUnit: "gallon" },
    { currencyCode: "1!!" },
    { description: DEMO_ESTIMATE_MARKER },
    { availabilityFrom: "2026-02-30" },
  ])
    assert.throws(
      () => revalidateListingImport({ ...row, ...patch }, refs),
      ApiError,
    );
});
test("company parameter rejects missing, duplicate, malformed and overflow IDs", () => {
  for (const params of [
    "",
    "sellerCompanyId=0",
    "sellerCompanyId=1&sellerCompanyId=2",
    "sellerCompanyId=2147483648",
    "sellerCompanyId=1e2",
  ])
    assert.throws(
      () => listingImportCompanyId(new URLSearchParams(params)),
      status(400),
    );
});

// Exercise actual persistence SQL and transaction boundaries with the real mssql request API.
// These are driver-stub checks, not SQL Server evidence.
test("preview persistence, commit/replay, conflict, expiry, authorization, and rollback", async (t) => {
  const pool = new sql.ConnectionPool("Server=127.0.0.1;Database=synthetic");
  t.mock.method(sql, "connect", async () => pool);
  t.mock.method(pool, "request", () => new sql.Request());
  t.mock.method(sql.Transaction.prototype, "begin", async () => undefined);
  const commit = t.mock.method(
    sql.Transaction.prototype,
    "commit",
    async () => undefined,
  );
  const rollback = t.mock.method(
    sql.Transaction.prototype,
    "rollback",
    async () => undefined,
  );
  const previews = new Map<string, Record<string, unknown>>();
  let inserts = 0,
    audit = 0,
    member = true,
    locations = true,
    material = true;
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      const p = (key: string) => this.parameters[key]?.value;
      let rows: Record<string, unknown>[] = [];
      if (statement.startsWith("DELETE TOP (100)")) {
        assert.match(statement, /CommittedAt IS NULL/);
        for (const [id] of [...previews]
          .filter(
            ([, r]) =>
              r.CommittedAt == null &&
              new Date(String(r.ExpiresAt)).getTime() <= Date.now(),
          )
          .slice(0, 100))
          previews.delete(id);
      } else if (statement.startsWith("WITH OldPreviews")) {
        assert.match(
          statement,
          /CommittedAt IS NULL AND ExpiresAt>SYSUTCDATETIME/,
        );
        const owned = [...previews]
          .filter(
            ([, r]) =>
              r.CreatedByUserId === p("user") &&
              r.SellerCompanyId === p("company") &&
              r.CommittedAt == null,
          )
          .reverse();
        for (const [id] of owned.slice(9)) previews.delete(id);
      } else if (statement.includes("FROM dbo.CompanyMembers"))
        rows = member ? [{ Id: 1 }] : [];
      else if (statement.includes("SELECT c.LegalName"))
        rows = [{ LegalName: refs.sellerCompanyName }];
      else if (statement.includes("FROM dbo.MaterialTypes")) {
        assert.match(statement, /WHERE IsActive=1/);
        assert.ok(!statement.includes("HOLDLOCK"));
        rows = material ? [{ Id: 1, Code: "wood", Name: "Wood chips" }] : [];
      } else if (statement.includes("FROM dbo.Locations")) {
        assert.match(statement, /Id IN \(@location0\)/);
        assert.equal(p("location0"), 7);
        rows = locations ? [{ Id: 7, Name: "Mill" }] : [];
      } else if (statement.includes("FROM dbo.ListingStatuses"))
        rows = [{ Id: 1 }];
      else if (statement.startsWith("INSERT dbo.ListingImportPreviews"))
        previews.set(String(p("id")), {
          RowsJson: p("rows"),
          ExpiresAt: p("expires"),
          SellerCompanyId: p("company"),
          CreatedByUserId: p("user"),
          CommittedAt: null,
          IdempotencyKey: null,
          ResultJson: null,
        });
      else if (statement.includes("FROM dbo.ListingImportPreviews")) {
        const found = previews.get(String(p("id")));
        if (
          found &&
          found.SellerCompanyId === p("company") &&
          found.CreatedByUserId === p("user")
        )
          rows = [found];
        if (statement.includes("WHERE Id=@id")) {
          if (statement.includes("UPDLOCK"))
            assert.match(statement, /WITH\(UPDLOCK,HOLDLOCK\)/);
        } else assert.match(statement, /WITH\(UPDLOCK,HOLDLOCK\)/);
      } else if (statement.startsWith("INSERT dbo.Listings(")) {
        inserts++;
        assert.equal(p("statusId"), 1);
        assert.equal(p("price"), 1234.5);
        assert.equal(
          JSON.parse(String(p("specs"))).availabilityFrom,
          "2026-10-01",
        );
        rows = [{ id: inserts }];
      } else if (statement.startsWith("UPDATE dbo.ListingImportPreviews")) {
        Object.assign(previews.get(String(p("id")))!, {
          CommittedAt: p("at"),
          IdempotencyKey: p("key"),
          ResultJson: p("result"),
        });
      } else if (statement.startsWith("INSERT dbo.AuditLogs")) {
        if (statement.includes("listing_import")) {
          assert.equal(p("company"), 2);
          assert.equal(JSON.parse(String(p("result"))).sellerCompanyId, 2);
        }
        audit++;
      } else throw new Error(`Unexpected SQL: ${statement}`);
      return { recordset: rows };
    },
  );
  const auth = { userId: 1, companyId: 2, isAdmin: false };
  const save = (rows = [validate()]) =>
    store.saveListingImportPreview(
      auth,
      2,
      refs.sellerCompanyName,
      rows,
      Buffer.from("synthetic"),
    );
  const preview = await save();
  const key = randomUUID();
  assert.equal(
    preview.expiresAt,
    new Date(Date.parse(preview.createdAt) + 86400000).toISOString(),
  );
  const result = await store.commitListingImport(
    auth,
    2,
    preview.previewId,
    key,
  );
  assert.equal(result.created.length, 1);
  assert.equal(inserts, 1);
  assert.equal(audit, 1);
  assert.deepEqual(
    await store.commitListingImport(auth, 2, preview.previewId, key),
    result,
  );
  assert.equal(inserts, 1);
  assert.equal(commit.mock.calls.length, 3);
  previews.get(preview.previewId)!.ExpiresAt = new Date(0);
  assert.deepEqual(
    await store.commitListingImport(auth, 2, preview.previewId, key),
    result,
  );
  const committedPreview = await store.getListingImportPreview(
    auth,
    2,
    preview.previewId,
  );
  assert.equal(committedPreview.committed, true);
  assert.deepEqual(committedPreview.result, result);
  await assert.rejects(
    store.commitListingImport(auth, 2, preview.previewId, randomUUID()),
    status(409),
  );
  member = false;
  await assert.rejects(
    store.commitListingImport(auth, 2, preview.previewId, key),
    status(403),
  );
  member = true;
  await assert.rejects(store.authorizeListingImport(auth, 3), status(403));
  assert.equal(
    await store.authorizeListingImport({ ...auth, isAdmin: true }, 3),
    refs.sellerCompanyName,
  );
  const bad = cells();
  bad[2] = 0;
  const invalid = await save([validate(bad)]);
  await assert.rejects(
    store.commitListingImport(auth, 2, invalid.previewId, randomUUID()),
    status(409),
  );
  const stale = await save();
  locations = false;
  await assert.rejects(
    store.commitListingImport(auth, 2, stale.previewId, randomUUID()),
    status(409),
  );
  locations = true;
  material = false;
  await assert.rejects(
    store.commitListingImport(auth, 2, stale.previewId, randomUUID()),
    status(409),
  );
  material = true;
  previews.get(stale.previewId)!.ExpiresAt = new Date(0);
  await assert.rejects(
    store.commitListingImport(auth, 2, stale.previewId, randomUUID()),
    status(410),
  );
  await assert.rejects(
    store.commitListingImport(
      { ...auth, userId: 99 },
      2,
      preview.previewId,
      key,
    ),
    status(404),
  );
  assert.equal(inserts, 1);
  assert.ok(rollback.mock.calls.length >= 6);
  const expiredId = stale.previewId;
  const otherAuth = { ...auth, userId: 3 };
  const other = await store.saveListingImportPreview(
    otherAuth,
    2,
    refs.sellerCompanyName,
    [validate()],
    Buffer.from("other"),
  );
  for (let i = 0; i < 12; i++) await save();
  assert.equal(previews.has(expiredId), false);
  assert.equal(
    previews.has(preview.previewId),
    true,
    "committed previews survive cleanup",
  );
  assert.equal(
    previews.has(other.previewId),
    true,
    "another owner survives the cap",
  );
  assert.equal(
    [...previews.values()].filter(
      (r) => r.CreatedByUserId === 1 && r.CommittedAt == null,
    ).length,
    10,
  );
});
test("HTTP authentication, company access, body validation and no-store headers", async (t) => {
  // Wrong-company denial happens before database access or body parsing.
  const handler = createListingImportHandler(async () => ({
    userId: 1,
    companyId: 2,
    isAdmin: false,
  }));
  const server = createServer((req, res) => {
    void handler(req, res, new URL(req.url!, "http://local")).catch(() => {
      res.writeHead(500);
      res.end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/listing-imports`;
  let response = await fetch(base + "/template?sellerCompanyId=3");
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  response = await fetch(base + "/template");
  assert.equal(response.status, 400);
  const { readWorkbookBody } = await import("./market-record-routes.js");
  const request = Readable.from([Buffer.from("bad")]) as IncomingMessage;
  request.headers = { "content-type": "text/plain" };
  await assert.rejects(
    readWorkbookBody(request),
    (error: unknown) =>
      error instanceof Error && "status" in error && error.status === 415,
  );
  request.headers = {
    "content-type": XLSX_MIME,
    "content-length": String(2 * 1024 * 1024 + 1),
  };
  await assert.rejects(
    readWorkbookBody(request),
    (error: unknown) =>
      error instanceof Error && "status" in error && error.status === 413,
  );
});

test("shared worker cap rejects saturation and recovers after parser failures", async () => {
  const { workbookWorker, MarketRecordError } = {
    ...(await import("./market-record-import.js")),
    ...(await import("./market-record-domain.js")),
  };
  const bytes = await workbook([cells()]);
  const moduleUrl = new URL("./listing-import-workbook.ts", import.meta.url)
    .href;
  const jobs = Array.from({ length: 3 }, () =>
    workbookWorker(bytes, moduleUrl, "parseListingWorkbookBytes"),
  );
  await assert.rejects(
    parseListingXlsx(bytes),
    (e: unknown) =>
      status(503)(e) && /busy.*retry/iu.test((e as Error).message),
  );
  await assert.rejects(
    workbookWorker(bytes, moduleUrl, "parseListingWorkbookBytes"),
    (e: unknown) => e instanceof MarketRecordError && e.status === 503,
  );
  await Promise.all(jobs);
  await assert.rejects(parseListingXlsx(Buffer.from("bad")), status(400));
  assert.equal((await parseListingXlsx(bytes)).length, 1);
});

test("resaved template permits AutoFilter, bounded print names, quoted and plain dropdown ranges", async () => {
  for (const sheetName of ["Lists", "'Lists'"]) {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      new Uint8Array(await listingImportTemplate(refs)).buffer,
    );
    const sheet = book.getWorksheet("Listings")!;
    sheet.getRow(2).values = cells();
    sheet.autoFilter = "A1:L2";
    book.definedNames.add("Listings!$A$1:$L$2", "_xlnm._FilterDatabase");
    sheet.pageSetup.printArea = "A1:L2";
    sheet.pageSetup.printTitlesRow = "1:1";
    sheet.pageSetup.printTitlesColumn = "A:B";
    sheet.getCell("B2").dataValidation = {
      type: "list",
      formulae: [`${sheetName}!$A$2:$A$2`],
    };
    const bytes = Buffer.from(await book.xlsx.writeBuffer());
    assert.equal((await parseListingXlsx(bytes)).length, 1);
    sheet.getCell("B2").dataValidation.formulae = ["'Lists'!$A$2:$A$999999"];
    await assert.rejects(
      parseListingXlsx(Buffer.from(await book.xlsx.writeBuffer())),
      status(400),
    );
  }
});

test("ambiguous materials name unambiguous codes or labels without selecting the wrong material", () => {
  const references = {
    ...refs,
    materials: [
      ...refs.materials,
      { id: 2, code: "chips", label: "wood" },
      { id: 3, code: "other", label: "Wood chips" },
    ],
  };
  const values = cells();
  values[1] = "wood";
  assert.equal(validate(values, references).status, "error");
  assert.match(
    validate(values, references).diagnostics[0]!.message,
    /code "chips"/,
  );
  values[1] = "Wood chips";
  assert.match(
    validate(values, references).diagnostics[0]!.message,
    /code "other"/,
  );
});

test("preview in-flight limit is per user across handler instances and releases on failure", async (t) => {
  const pool = new sql.ConnectionPool("Server=127.0.0.1;Database=synthetic");
  t.mock.method(sql, "connect", async () => pool);
  t.mock.method(pool, "request", () => new sql.Request());
  t.mock.method(sql.Request.prototype, "query", async () => ({
    recordset: [{ LegalName: "Synthetic" }],
  }));
  const { ServerResponse } = await import("node:http");
  const request = new Readable({
    read() {
      reading();
    },
  }) as IncomingMessage;
  request.method = "POST";
  request.headers = { "content-type": XLSX_MIME };
  const url = new URL(
    "http://local/api/listing-imports/preview?sellerCompanyId=2",
  );
  let reading!: () => void;
  const started = new Promise<void>((resolve) => {
    reading = resolve;
  });

  const auth = async () => ({ userId: 1, companyId: 2, isAdmin: true });
  const first = createListingImportHandler(auth)(
    request,
    new ServerResponse(request),
    url,
  );
  await started;
  async function attempt(userId: number) {
    const req = Readable.from([Buffer.from("bad")]) as IncomingMessage;
    req.method = "POST";
    req.headers = { "content-type": XLSX_MIME };
    const res = new ServerResponse(req);
    await createListingImportHandler(async () => ({
      userId,
      companyId: 2,
      isAdmin: true,
    }))(req, res, url);
    return res.statusCode;
  }
  assert.equal(await attempt(1), 429);
  assert.equal(await attempt(2), 400, "different user reaches parser");
  request.push(Buffer.from("bad"));
  request.push(null);
  await first;
  assert.equal(await attempt(1), 400, "failed preview releases user slot");
});

test("expanded cell limits retain HTTP 413", async () => {
  const values = cells();
  values[8] = "x".repeat(20001);
  await assert.rejects(parseListingXlsx(await workbook([values])), status(413));
});

test("listing parser deadlines return a clear HTTP 422 and release the worker slot", async (t) => {
  const bytes = await workbook([cells()]);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const parsed = parseListingXlsx(bytes);
  t.mock.timers.tick(10001);
  await assert.rejects(
    parsed,
    (e: unknown) => status(422)(e) && /deadline/iu.test((e as Error).message),
  );
  t.mock.timers.reset();
  assert.equal((await parseListingXlsx(bytes)).length, 1);
});
