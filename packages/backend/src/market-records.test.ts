import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import ExcelJS from "exceljs";
import sql from "mssql";
import { deflateRawSync } from "node:zlib";
import {
  recordInput,
  reviewRecord,
  fingerprint,
  decimal,
  MarketRecordError,
  importDisposition,
  version,
} from "./market-record-domain.js";
import {
  parseXlsx,
  parseWorkbookBytes,
  preflightXlsx,
  workbookHeaders,
  XLSX_MIME,
  importLimits,
} from "./market-record-import.js";
import {
  readWorkbookBody,
  createMarketRecordHandler,
} from "./market-record-routes.js";
import { createSchemaHandler } from "./schema-routes.js";
import { ApiError } from "./http.js";
import {
  previewTotals,
  pagination,
  boundedPage,
  nearDuplicateRows,
  getRecord,
} from "./market-record-store.js";

const input = () => ({
  role: "seller",
  companyName: "Synthetic company",
  feedstock: "Synthetic feedstock",
  sourceRecordType: "prospect",
  address: {
    street: "1 Synthetic Road",
    city: "Example",
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
  volume: {
    value: "12.500",
    unit: "t",
    period: "annual",
    citation: "Synthetic volume source",
  },
  sourceChecked: true,
});
test("SQL rowversion projection casts to binary before hex conversion and serializes a reusable wire version", async (t) => {
  // Driver stub only: this checks the actual store query and hydration, not SQL execution.
  // Hosted SQL confirmed direct rowversion-to-varchar ignores style 2; binary(8) honors it.
  const transaction = new sql.Transaction();
  const request = new sql.Request(transaction);
  t.mock.method(transaction, "request", () => request);
  t.mock.method(request, "query", async (statement: string) => {
    assert.match(
      statement,
      /CONVERT\(VARCHAR\(16\),\s*CAST\(r\.Version AS BINARY\(8\)\),\s*2\) VersionHex/iu,
    );
    assert.equal(request.parameters.id?.value, 3);
    return {
      recordset: [
        {
          Id: 3,
          Role: "seller",
          CompanyName: "Synthetic company",
          Feedstock: "Synthetic feedstock",
          SourceRecordType: "prospect",
          SourceChecked: false,
          AddressPurpose: "unknown",
          PriceStatus: "unknown",
          VolumeStatus: "unknown",
          AddressStatus: "unknown",
          Status: "active",
          VersionHex: Buffer.from("000000000000abe5", "hex")
            .toString("hex")
            .toUpperCase(),
          CreatedAt: new Date("2026-10-13T12:00:00.000Z"),
          UpdatedAt: new Date("2026-10-13T12:00:00.000Z"),
          CreatedByUserId: 17,
          UpdatedByUserId: 17,
        },
      ],
    };
  });
  const record = await getRecord(3, transaction);
  const wireRecord = JSON.parse(JSON.stringify(record));
  assert.equal(wireRecord.version, "000000000000abe5");
  assert.equal(version(wireRecord.version), record.version);
  assert.throws(
    () => version("\u0000\u0000\u0000\u0000\u0000\u0000\u00ab\u00e5"),
    MarketRecordError,
  );
  assert.throws(() => version("abe5"), MarketRecordError);
});
test("research values preserve null and explicit zero, signed gate fee, annual period and source assertions", () => {
  const data = recordInput(input());
  assert.equal(data.price.value, "0");
  assert.equal(data.volume.value, "12.5");
  assert.equal(data.volume.period, "annual");
  assert.equal(data.price.status, "unknown");
  assert.equal(data.addressReview.status, "unknown");
  assert.equal(data.sourceCheckedBy, null);
  assert.equal(
    recordInput({
      ...input(),
      price: { value: "-50", currencyCode: "USD", perUnit: "t" },
    }).price.value,
    "-50",
  );
  assert.equal(
    recordInput({ ...input(), price: { value: null }, volume: { value: null } })
      .price.value,
    null,
  );
  assert.equal(
    decimal("9007199254740991.12", "price", 2, true),
    "9007199254740991.12",
  );
});
test("strict field boundary rejects forged reviewer, false decimal coercions and incompatible type/role", () => {
  for (const bad of [
    { ...input(), sourceRecordType: undefined },
    { ...input(), companyName: "" },
    { ...input(), reviewedByUserId: 1 },
    { ...input(), price: { ...input().price, status: "confirmed" } },
    { ...input(), price: { value: true } },
    { ...input(), price: { value: "1e2" } },
    {
      ...input(),
      price: { value: "1.001", currencyCode: "USD", perUnit: "t" },
    },
    { ...input(), volume: { value: "-1", unit: "t" } },
    { ...input(), role: "buyer", sourceRecordType: "confirmed_stream" },
    { ...input(), sourceRecordType: "buyer_need" },
    { ...input(), buyerNeed: "need" },
    { ...input(), sourceCheckedAt: "2026-02-30T00:00:00.000Z" },
  ])
    assert.throws(() => recordInput(bad), MarketRecordError);
});
test("review requires evidence and complete facts; changing a value or citation resets only its review", () => {
  const data = recordInput(input());
  const reviewed = reviewRecord(
    data,
    "price",
    "confirmed",
    "Review citation",
    17,
    "2026-10-13T12:00:00.000Z",
  );
  assert.equal(reviewed.price.reviewedByUserId, 17);
  assert.equal(reviewed.price.status, "confirmed");
  assert.equal(reviewed.volume.status, "unknown");
  const unchanged = recordInput({ companyName: "New name" }, reviewed);
  assert.equal(unchanged.price.status, "confirmed");
  for (const price of [
    {
      value: "5",
      currencyCode: "USD",
      perUnit: "t",
      citation: "Review citation",
    },
    {
      value: "0",
      currencyCode: "USD",
      perUnit: "t",
      citation: "Changed citation",
    },
  ]) {
    const changed = recordInput({ price }, reviewed);
    assert.equal(changed.price.status, "unknown");
    assert.equal(changed.price.reviewedByUserId, null);
  }
  assert.throws(
    () =>
      reviewRecord(
        data,
        "price",
        "confirmed",
        null,
        17,
        "2026-10-13T12:00:00.000Z",
      ),
    MarketRecordError,
  );
  assert.throws(
    () =>
      reviewRecord(
        recordInput({ ...input(), price: { value: null } }),
        "price",
        "confirmed",
        "source",
        17,
        "2026-10-13T12:00:00.000Z",
      ),
    MarketRecordError,
  );
});
test("identity includes full address and role, preserves punctuation, and normalizes spacing/case", () => {
  const data = recordInput(input());
  assert.ok(
    fingerprint(data).equals(
      fingerprint(
        recordInput({ ...input(), companyName: "  SYNTHETIC   COMPANY " }),
      ),
    ),
  );
  assert.ok(
    !fingerprint(data).equals(
      fingerprint(
        recordInput({
          ...input(),
          address: { ...input().address, street: "2 Synthetic Road" },
        }),
      ),
    ),
  );
  assert.ok(
    !fingerprint(data).equals(
      fingerprint(
        recordInput({ ...input(), companyName: "Synthetic-company" }),
      ),
    ),
  );
});
async function workbook(
  customize?: (book: ExcelJS.Workbook) => void,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  for (const name of ["Sellers", "Buyers"]) {
    const sheet = book.addWorksheet(name);
    sheet.addRow(workbookHeaders);
    sheet.addRow([
      "Synthetic organization",
      "Synthetic plant",
      "1 Example Road",
      "Example",
      "LA",
      "00123",
      "USA",
      "Synthetic material",
      "Synthetic group",
      name === "Sellers" ? 12.5 : null,
      name === "Sellers" ? "t/yr" : null,
      name === "Sellers" ? -50 : null,
      name === "Sellers" ? "USD" : null,
      name === "Sellers" ? "t" : null,
      "Yes",
      name === "Sellers" ? "Confirmed stream" : "Buyer need",
      "Synthetic citation",
      "Synthetic address source",
    ]);
  }
  customize?.(book);
  return Buffer.from(await book.xlsx.writeBuffer());
}
test("real worker parser accepts synthetic XLSX and keeps import confirmations unknown or estimated", async () => {
  const result = await parseXlsx(await workbook());
  assert.equal(result.rows.length, 2);
  assert.equal(result.fileSha256.length, 64);
  for (const row of result.rows) {
    assert.equal(row.decision, "create");
    assert.equal(row.proposedRecord?.sourceChecked, true);
    assert.equal(row.proposedRecord?.sourceCheckedBy, null);
    assert.equal(row.proposedRecord?.address.purpose, "unknown");
    assert.equal(row.proposedRecord?.addressReview.status, "unknown");
    assert.equal(row.proposedRecord?.price.reviewedByUserId, null);
  }
  assert.equal(result.rows[0]?.proposedRecord?.price.value, "-50");
  assert.equal(result.rows[0]?.proposedRecord?.price.status, "estimated");
  assert.equal(result.rows[1]?.proposedRecord?.price.value, null);
});
test("numeric postal formatting is explicit, countries normalize with warnings, incomplete A-only rows are errors", async () => {
  const rows = await parseWorkbookBytes(
    await workbook((book) => {
      const sheet = book.getWorksheet("Sellers")!;
      sheet.getCell("F2").value = 123;
      sheet.getCell("F2").numFmt = "00000";
      sheet.addRow(["Incomplete synthetic company"]);
    }),
  );
  assert.equal(rows[0]?.proposedRecord?.address.postalCode, "00123");
  assert.ok(rows[0]?.diagnostics.some((d) => d.code === "country_normalized"));
  assert.equal(rows[1]?.decision, "error");
});
test("unrecognized single-column prose is diagnosed as an error, never discarded as a footer", async () => {
  const rows = await parseWorkbookBytes(
    await workbook((book) =>
      book
        .getWorksheet("Sellers")!
        .addRow(["Synthetic note that is not a recognized template footer."]),
    ),
  );
  assert.deepEqual(previewTotals(rows), {
    sourceRows: 3,
    createRows: 2,
    duplicateRows: 0,
    errorRows: 1,
    ignoredRows: 0,
  });
});

test("parser rejects formulas including cached results, hidden/extra sheets, unsafe sparse cells and wrong headers", async () => {
  for (const alter of [
    (b: ExcelJS.Workbook) => {
      b.getWorksheet("Sellers")!.getCell("J2").value = {
        formula: "1+1",
        result: 2,
      };
    },
    (b: ExcelJS.Workbook) => {
      b.addWorksheet("Extra");
    },
    (b: ExcelJS.Workbook) => {
      b.getWorksheet("Sellers")!.state = "hidden";
    },
    (b: ExcelJS.Workbook) => {
      b.getWorksheet("Sellers")!.getCell("Z9999").value = "sparse";
    },
    (b: ExcelJS.Workbook) => {
      b.getWorksheet("Sellers")!.getCell("A1").value = "Unexpected";
    },
  ]) {
    const bytes = await workbook(alter);
    await assert.rejects(() => parseWorkbookBytes(bytes), Error);
  }
});
test("parser rejects malformed ZIP, oversized input, long cell text and invalid enum with diagnostics", async () => {
  await assert.rejects(
    () => preflightXlsx(Buffer.from("not zip")),
    MarketRecordError,
  );
  await assert.rejects(
    () => parseXlsx(Buffer.alloc(importLimits.compressed + 1)),
    MarketRecordError,
  );
  const long = await workbook((book) => {
    book.getWorksheet("Sellers")!.getCell("A2").value = "x".repeat(
      importLimits.text + 1,
    );
  });
  await assert.rejects(() => parseWorkbookBytes(long), Error);
  const rows = await parseWorkbookBytes(
    await workbook((book) => {
      book.getWorksheet("Buyers")!.getCell("O2").value = "Maybe";
    }),
  );
  assert.equal(rows[1]?.decision, "error");
  assert.ok(rows[1]?.diagnostics.some((d) => d.severity === "error"));
});
function request(body: Buffer, contentType = XLSX_MIME): IncomingMessage {
  const req = Readable.from([body]) as IncomingMessage;
  req.headers = { "content-type": contentType };
  return req;
}
function response(): ServerResponse {
  return {
    setHeader() {},
    writeHead() {},
    end() {},
  } as unknown as ServerResponse;
}
test("raw upload reader rejects MIME and stream overflow without parsing", async () => {
  await assert.rejects(
    () => readWorkbookBody(request(Buffer.from("x"), "application/json")),
    MarketRecordError,
  );
  await assert.rejects(
    () => readWorkbookBody(request(Buffer.alloc(importLimits.compressed + 1))),
    MarketRecordError,
  );
});
test("every market record route authenticates before body parsing or resource lookup", async () => {
  const paths = [
    "",
    "/1",
    "/1/archive",
    "/1/restore",
    "/1/audit",
    "/1/confirmations/price",
    "/imports/preview",
    "/imports/00000000-0000-4000-8000-000000000001",
    "/imports/00000000-0000-4000-8000-000000000001/commit",
  ];
  for (const path of paths)
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      for (const role of ["anonymous", "buyer", "seller"]) {
        const handler = createMarketRecordHandler(async () => {
          if (role === "anonymous")
            throw new ApiError(401, "Session required.");
          return { userId: 1, companyId: 2, isAdmin: false };
        });
        const req = request(Buffer.from("malformed"), "text/plain");
        req.method = method;
        await assert.rejects(
          () =>
            handler(
              req,
              response(),
              new URL("http://local/api/admin/market-records" + path),
            ),
          (e: unknown) =>
            e instanceof ApiError &&
            e.status === (role === "anonymous" ? 401 : 403),
        );
      }
    }
});
test("schema inventory protects metadata before health/database access and permits an admin", async () => {
  let reads = 0;
  for (const role of ["anonymous", "buyer", "seller", "admin"]) {
    const handler = createSchemaHandler(
      async () => {
        if (role === "anonymous") throw new ApiError(401, "Session required.");
        return { userId: 1, isAdmin: role === "admin" };
      },
      async () => {
        reads++;
        return { configured: true, connected: true };
      },
      async () => [],
    );
    if (role === "admin")
      assert.equal(
        await handler(
          request(Buffer.alloc(0)),
          response(),
          new URL("http://local/schema/tables"),
        ),
        false,
      );
    else {
      const req = request(Buffer.alloc(0));
      req.method = "GET";
      await assert.rejects(
        () => handler(req, response(), new URL("http://local/schema/tables")),
        ApiError,
      );
    }
  }
  assert.equal(reads, 0);
  const req = request(Buffer.alloc(0));
  req.method = "GET";
  await createSchemaHandler(
    async () => ({ userId: 1, isAdmin: true }),
    async () => {
      reads++;
      return { configured: true, connected: true };
    },
    async () => [],
  )(req, response(), new URL("http://local/schema/tables"));
  assert.equal(reads, 1);
});
test("pagination rejects unsafe values and accepts pages over the previous 100-row limit", () => {
  assert.deepEqual(pagination(new URLSearchParams("limit=200&cursor=123")), {
    limit: 200,
    cursor: 123,
  });
  for (const query of [
    "limit=201",
    "limit=-1",
    "cursor=1e2",
    "cursor=99999999999",
  ])
    assert.throws(
      () => pagination(new URLSearchParams(query)),
      MarketRecordError,
    );
});
test("excluding the original row never resurrects its preview-skipped duplicate", () => {
  const row = {
    rowKey: "Sellers!2",
    sheet: "Sellers",
    rowNumber: 2,
    proposedRecord: recordInput(input()),
    decision: "create" as const,
    diagnostics: [],
    duplicateOfId: null,
  };
  assert.equal(importDisposition(row, true, null), "excluded");
  assert.equal(
    importDisposition(
      { ...row, rowKey: "Sellers!3", decision: "skip" },
      false,
      null,
    ),
    "duplicate",
  );
  assert.equal(importDisposition(row, false, 123), "duplicate");
  assert.equal(importDisposition(row, false, null), "created");
  assert.throws(
    () => importDisposition({ ...row, decision: "error" }, false, null),
    MarketRecordError,
  );
});
// Test-only ZIP writer: synthetic XML, never source workbook contents.
function zipFixture(entries: [string, string][], flags = 0): Buffer {
  const locals: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const [name, xml] of entries) {
    const fileName = Buffer.from(name),
      content = Buffer.from(xml),
      compressed = deflateRawSync(content);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(fileName.length, 26);
    locals.push(local, fileName, compressed);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(flags, 8);
    directory.writeUInt16LE(8, 10);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(compressed.length, 20);
    directory.writeUInt32LE(content.length, 24);
    directory.writeUInt16LE(fileName.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, fileName);
    offset += local.length + fileName.length + compressed.length;
  }
  const dir = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}
test("ZIP preflight rejects macros, external workbook refs, DTD, duplicate entries, unsafe names and encryption", async () => {
  const base: [string, string][] = [
    ["[Content_Types].xml", "<Types/>"],
    ["xl/workbook.xml", "<workbook/>"],
  ];
  for (const entries of [
    [...base, ["xl/vbaProject.xml", "<vba/>"]],
    [
      ...base,
      [
        "xl/_rels/workbook.xml.rels",
        '<Relationships><Relationship TargetMode="External" Type="externalLink" Target="https://example.test"/></Relationships>',
      ],
    ],
    [...base, ["xl/styles.xml", '<!DOCTYPE x [<!ENTITY x "boom">]><x>&x;</x>']],
    [...base, ["xl/styles.xml", "<styles/>"], ["xl/styles.xml", "<styles/>"]],
    [...base, ["../unsafe.xml", "<x/>"]],
    [
      ...base,
      [
        "xl/worksheets/sheet1.xml",
        '<worksheet><row r="2"><c r="A2"/><c r="A2"/></row></worksheet>',
      ],
    ],
  ] as [string, string][][])
    await assert.rejects(() => preflightXlsx(zipFixture(entries)), Error);
  await assert.rejects(() => preflightXlsx(zipFixture(base, 1)), Error);
});
test("ZIP actual inflation and entry counts are bounded before Excel parsing", async () => {
  const huge = zipFixture([
    ["xl/workbook.xml", "x".repeat(importLimits.entry + 1)],
  ]);
  assert.ok(huge.length < importLimits.compressed);
  await assert.rejects(() => preflightXlsx(huge), MarketRecordError);
  const many = Array.from(
    { length: importLimits.entries + 1 },
    (_, i) => [`part${i}.xml`, `<x/>`] as [string, string],
  );
  await assert.rejects(
    () => preflightXlsx(zipFixture(many)),
    MarketRecordError,
  );
});
test("passive citation hyperlinks retain their URL, while active protocols and noncitation cells are rejected", async () => {
  const positive = await workbook((book) => {
    book.getWorksheet("Sellers")!.getCell("Q2").value = {
      text: "Synthetic source",
      hyperlink: "https://example.test/source",
    };
  });
  const rows = await parseWorkbookBytes(positive);
  assert.equal(
    rows[0]?.proposedRecord?.sourceCitation,
    "Synthetic source (https://example.test/source)",
  );
  for (const [cell, url] of [
    ["Q2", "javascript:alert(1)"],
    ["R2", "file:///tmp/private"],
    ["Q2", "https://user:secret@example.test/"],
    ["A2", "https://example.test/"],
  ]) {
    const bytes = await workbook((book) => {
      book.getWorksheet("Sellers")!.getCell(cell!).value = {
        text: "Synthetic link",
        hyperlink: url!,
      };
    });
    await assert.rejects(() => parseWorkbookBytes(bytes), Error);
  }
});
test("worker deadline terminates parsing rather than blocking the API event loop", async () => {
  const bytes = await workbook(),
    original = importLimits.deadlineMs;
  importLimits.deadlineMs = 1;
  try {
    await assert.rejects(
      () => parseXlsx(bytes),
      (e: unknown) => e instanceof MarketRecordError && e.status === 413,
    );
  } finally {
    importLimits.deadlineMs = original;
  }
});
test("large Unicode records and audit snapshots produce bounded pages without losing pagination", () => {
  const large = { id: 1, text: "é".repeat(16000) },
    items = Array.from({ length: 200 }, (_, i) => ({ ...large, id: i + 1 }));
  const page = boundedPage(items);
  assert.ok(page.length > 0 && page.length < items.length);
  assert.ok(
    Buffer.byteLength(
      JSON.stringify({
        ok: true,
        records: page,
        total: 200,
        nextCursor: String(page.at(-1)?.id),
      }),
      "utf8",
    ) <
      3 * 1024 * 1024,
  );
  assert.equal(page.at(-1)?.id, page.length);
  assert.throws(
    () => boundedPage([{ text: "x".repeat(3 * 1024 * 1024) }]),
    MarketRecordError,
  );
});
test("only static bounded filter names are accepted; calculation names remain forbidden", async () => {
  const base: [string, string][] = [["[Content_Types].xml", "<Types/>"]];
  await preflightXlsx(
    zipFixture([
      ...base,
      [
        "xl/workbook.xml",
        '<workbook><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0">Sellers!$A$1:$R$4</definedName></definedNames></workbook>',
      ],
    ]),
  );
  for (const xml of [
    '<workbook><definedName name="Calculate">1+1</definedName></workbook>',
    '<workbook><definedName name="_xlnm._FilterDatabase" localSheetId="0">[external.xlsx]Sheet1!$A$1</definedName></workbook>',
    '<workbook><definedName name="_xlnm._FilterDatabase" localSheetId="0">Sellers!$A$1:$R$9999</definedName></workbook>',
  ])
    await assert.rejects(
      () => preflightXlsx(zipFixture([...base, ["xl/workbook.xml", xml]])),
      Error,
    );
});
test("near-duplicate grouping handles the maximum row count without changing exact-duplicate decisions", () => {
  const rows = Array.from({ length: 2000 }, (_, i) => ({
    rowKey: `Sellers!${i + 2}`,
    sheet: "Sellers",
    rowNumber: i + 2,
    proposedRecord: recordInput({
      ...input(),
      feedstock: `Synthetic material ${i}`,
    }),
    decision: "create" as const,
    diagnostics: [],
    duplicateOfId: null,
  }));
  const warnings = nearDuplicateRows(rows);
  assert.equal(warnings.size, 2000);
  assert.ok(rows.every((r) => r.decision === "create"));
  assert.equal(
    nearDuplicateRows([rows[0]!, { ...rows[0]!, rowKey: "Sellers!2005" }]).size,
    0,
  );
});
test("ZIP local/central name mismatch and corrupt CRC are rejected", async () => {
  const entries: [string, string][] = [
    ["[Content_Types].xml", "<Types/>"],
    ["xl/workbook.xml", "<workbook/>"],
  ];
  const mismatch = zipFixture(entries);
  mismatch[30] = 0x78;
  await assert.rejects(() => preflightXlsx(mismatch), Error);
  const corrupt = zipFixture(entries),
    central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  corrupt.writeUInt32LE(1, central + 16);
  await assert.rejects(() => preflightXlsx(corrupt), Error);
});
test("authenticated admin oversized, exponent and nondecimal route IDs fail before any SQL access", async () => {
  const handler = createMarketRecordHandler(async () => ({
    userId: 1,
    isAdmin: true,
  }));
  for (const id of [
    "2147483648",
    "9999999999999999999999",
    "1e2",
    "0",
    "-1",
    "1.5",
  ]) {
    let status = 0,
      body = "";
    const res = {
      setHeader() {},
      writeHead(value: number) {
        status = value;
      },
      end(value: string) {
        body = value;
      },
    } as unknown as ServerResponse;
    const req = request(Buffer.alloc(0));
    req.method = "GET";
    assert.equal(
      await handler(
        req,
        res,
        new URL(`http://local/api/admin/market-records/${id}`),
      ),
      true,
    );
    assert.equal(status, 400);
    assert.equal(JSON.parse(body).code, "validation_failed");
  }
});
