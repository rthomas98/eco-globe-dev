import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import sql from "mssql";
// Synthetic driver only; never connect to a real database. Set before loading database.ts.
process.env.SQL_CONNECTION_STRING = "synthetic-test-no-network";
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-test-no-network";
const { referenceInput, referenceId } =
  await import("./market-reference-domain.js");
const { createReferenceHandler } = await import("./market-reference-routes.js");
const { createMarketRecordHandler } = await import("./market-record-routes.js");
const { createReference, downloadReference, listReferences } =
  await import("./market-reference-store.js");
const { ApiError } = await import("./http.js");
async function pdf() {
  const doc = await PDFDocument.create();
  doc.addPage();
  return Buffer.from(await doc.save());
}
function body(bytes: Buffer) {
  return {
    fileName: "Référence (original).pdf",
    title: "Internal study",
    material: "Gypsum",
    notes: null,
    recordIds: [3, 1],
    reason: "Research intake",
    contentBase64: bytes.toString("base64"),
  };
}
function response() {
  const headers = new Map<string, unknown>();
  let status = 0,
    bytes = Buffer.alloc(0);
  const res = {
    setHeader(name: string, value: unknown) {
      headers.set(name.toLowerCase(), value);
    },
    writeHead(code: number, values: Record<string, unknown>) {
      status = code;
      for (const [key, value] of Object.entries(values))
        headers.set(key.toLowerCase(), value);
    },
    end(value: string | Buffer) {
      bytes = Buffer.from(value);
    },
  } as unknown as ServerResponse;
  return {
    res,
    headers,
    get status() {
      return status;
    },
    get bytes() {
      return bytes;
    },
    json() {
      return JSON.parse(bytes.toString());
    },
  };
}
function request(value: unknown, method = "POST") {
  const req = Readable.from([JSON.stringify(value)]) as IncomingMessage;
  req.method = method;
  req.headers = { "content-type": "application/json" };
  return req;
}
const prefix = "/api/admin/market-records/references";
test("validation preserves original bytes/hash, bounds strings, IDs and unmatched documents", async () => {
  const bytes = await pdf(),
    valid = await referenceInput(body(bytes));
  assert.deepEqual(valid.bytes, bytes);
  assert.match(valid.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(valid.recordIds, [1, 3]);
  assert.deepEqual(
    (await referenceInput({ ...body(bytes), recordIds: [] })).recordIds,
    [],
  );
  for (const change of [
    { recordIds: [1, 1] },
    { recordIds: ["1"] },
    { recordIds: [2147483648] },
    { recordIds: Array(101).fill(1) },
    { title: "x".repeat(241) },
    { material: "" },
    { notes: "x".repeat(4001) },
    { reason: "" },
    { fileName: "../x.pdf" },
    { fileName: "x\r\n.pdf" },
    { status: "approved" },
  ])
    await assert.rejects(referenceInput({ ...body(bytes), ...change }));
  for (const id of ["01", "1e1", "0", "2147483648", "-1", "1.0", null])
    assert.throws(() => referenceId(id));
});
test("real parser rejects malformed, encrypted, active, oversized and noncanonical PDFs", async () => {
  const bytes = await pdf();
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.catalog.set(
    PDFName.of("OpenAction"),
    doc.context.obj({
      S: PDFName.of("JavaScript"),
      JS: PDFString.of("app.alert('x')"),
    }),
  );
  const active = Buffer.from(await doc.save());
  const encryptedDoc = await PDFDocument.create();
  encryptedDoc.addPage();
  encryptedDoc.context.trailerInfo.Encrypt = encryptedDoc.context.register(
    encryptedDoc.context.obj({ Filter: PDFName.of("Standard"), V: 1, R: 2 }),
  );
  const encrypted = Buffer.from(await encryptedDoc.save());
  for (const bad of [
    Buffer.from("%PDF-1.4\nFake\n%%EOF"),
    active,
    encrypted,
    Buffer.alloc(5 * 1024 * 1024 + 1),
  ])
    await assert.rejects(referenceInput(body(bad)));
  await assert.rejects(
    referenceInput({
      ...body(bytes),
      contentBase64: bytes.toString("base64") + "!",
    }),
  );
});
test("admin authorization precedes malformed IDs/body/PDF/database work on every route", async () => {
  let calls = 0;
  const repository = {
    listReferences: async () => {
      calls++;
      return [];
    },
    createReference: async () => {
      calls++;
      throw Error("unexpected");
    },
    downloadReference: async () => {
      calls++;
      throw Error("unexpected");
    },
  };
  for (const auth of [
    async () => {
      throw new ApiError(401, "Login required");
    },
    async () => ({ userId: 2, isAdmin: false }),
  ]) {
    for (const path of [
      prefix,
      prefix + "?recordId=bad",
      prefix + "/bad/download",
    ]) {
      const req = request({ bad: "body" }),
        out = response();
      let reads = 0;
      req.on("data", () => reads++);
      await createReferenceHandler(auth, repository)(
        req,
        out.res,
        new URL(path, "http://localhost"),
      );
      assert.ok([401, 403].includes(out.status));
      assert.equal(reads, 0);
      assert.equal(out.headers.get("cache-control"), "private, no-store");
    }
  }
  assert.equal(calls, 0);
  // Exact integration routing proves references are dispatched before generic numeric records.
  const out = response();
  await createMarketRecordHandler(async () => ({ userId: 2, isAdmin: false }))(
    request({}),
    out.res,
    new URL(prefix + "/bad/download", "http://localhost"),
  );
  assert.equal(out.status, 403);
});
test("download attaches original bytes with encoded filename and restrictive private headers", async () => {
  const bytes = await pdf(),
    out = response();
  const handler = createReferenceHandler(
    async () => ({ userId: 9, isAdmin: true }),
    {
      listReferences: async () => [],
      createReference: async () => {
        throw Error("unexpected");
      },
      downloadReference: async (id) => {
        assert.equal(id, 7);
        return { fileName: "Référence (original).pdf", bytes };
      },
    },
  );
  await handler(
    request({}, "GET"),
    out.res,
    new URL(prefix + "/7/download", "http://localhost"),
  );
  assert.equal(out.status, 200);
  assert.deepEqual(out.bytes, bytes);
  assert.equal(out.headers.get("content-type"), "application/pdf");
  assert.equal(out.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    String(out.headers.get("content-security-policy")),
    /sandbox; default-src 'none'/,
  );
  assert.match(
    String(out.headers.get("content-disposition")),
    /attachment.*filename\*=UTF-8''R%C3%A9f%C3%A9rence%20%28original%29.pdf/,
  );
});
test("body limits and duplicate errors are explicit and private", async () => {
  const bytes = await pdf();
  let calls = 0;
  const { MarketRecordError } = await import("./market-record-domain.js");
  const handler = createReferenceHandler(
    async () => ({ userId: 9, isAdmin: true }),
    {
      listReferences: async () => [],
      downloadReference: async () => {
        throw Error();
      },
      createReference: async () => {
        calls++;
        throw new MarketRecordError(
          409,
          "duplicate_reference",
          "Already exists",
          { existingId: "8" },
        );
      },
    },
  );
  let req = request(body(bytes));
  req.headers["content-length"] = "8388609";
  let out = response();
  await handler(req, out.res, new URL(prefix, "http://localhost"));
  assert.equal(out.status, 413);
  assert.equal(calls, 0);
  req = request("x".repeat(8 * 1024 * 1024));
  out = response();
  await handler(req, out.res, new URL(prefix, "http://localhost"));
  assert.equal(out.status, 413);
  assert.equal(calls, 0);
  out = response();
  await handler(
    request(body(bytes)),
    out.res,
    new URL(prefix, "http://localhost"),
  );
  assert.equal(out.status, 409);
  assert.equal(out.json().existingId, 8);
  assert.equal(out.json().ok, false);
});

test("store executes byte-preserving transaction, validates associations before inserts and rolls back failures", async (t) => {
  const bytes = await pdf(),
    input = await referenceInput(body(bytes));
  const events: string[] = [];
  let mode = "success";
  // Run actual store and runInTransaction against a stub driver, including begin/commit/rollback.
  t.mock.method(
    sql,
    "connect",
    async () => new sql.ConnectionPool("synthetic"),
  );
  t.mock.method(sql.Transaction.prototype, "begin", async () => {
    events.push("begin");
  });
  t.mock.method(sql.Transaction.prototype, "commit", async () => {
    events.push("commit");
  });
  t.mock.method(sql.Transaction.prototype, "rollback", async () => {
    events.push("rollback");
  });
  const row = {
    Id: 7,
    Title: input.title,
    Material: input.material,
    Notes: null,
    FileName: input.fileName,
    Sha256: input.sha256,
    SizeBytes: bytes.length,
    UploadedByUserId: 9,
    UploadedByUserName: "Admin",
    CreatedAt: new Date(),
    RecordIds: '[{"id":1},{"id":3}]',
  };
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      if (statement.includes("sp_getapplock")) {
        events.push("lock");
        return { recordset: [{ result: 0 }] };
      }
      if (statement.startsWith("SELECT Id FROM dbo.MarketReferences")) {
        events.push("duplicate-check");
        return {
          recordset:
            mode === "duplicate" || mode === "race-read" ? [{ Id: 7 }] : [],
        };
      }
      if (statement.startsWith("SELECT Id FROM dbo.MarketRecords")) {
        events.push("record-check");
        return {
          recordset:
            mode === "missing" ? [] : [{ Id: this.parameters.id?.value }],
        };
      }
      if (statement.startsWith("INSERT dbo.MarketReferences")) {
        events.push("insert");
        assert.deepEqual(this.parameters.content?.value, bytes);
        assert.deepEqual(
          this.parameters.hash?.value,
          Buffer.from(input.sha256, "hex"),
        );
        if (mode === "race") {
          mode = "race-read";
          throw Object.assign(Error("unique race"), { number: 2627 });
        }
        return { recordset: [{ Id: 7 }] };
      }
      if (statement.startsWith("INSERT dbo.MarketReferenceRecords")) {
        events.push("link");
        return { recordset: [] };
      }
      if (statement.startsWith("INSERT dbo.AuditLogs")) {
        events.push("audit");
        assert.equal(this.parameters.reason?.value, input.reason);
        assert.ok(
          !String(this.parameters.next?.value).includes("contentBase64"),
        );
        if (mode === "audit-fail") throw Error("audit unavailable");
        return { recordset: [] };
      }
      if (statement.startsWith("SELECT FileName,Content"))
        return { recordset: [{ FileName: input.fileName, Content: bytes }] };
      if (statement.startsWith("SELECT r.Id")) return { recordset: [row] };
      throw Error("Unexpected SQL: " + statement);
    },
  );
  const saved = await createReference(input, 9);
  assert.equal(saved.id, 7);
  assert.deepEqual(events, [
    "begin",
    "lock",
    "duplicate-check",
    "record-check",
    "record-check",
    "insert",
    "link",
    "link",
    "audit",
    "commit",
  ]);
  // Download requires a pool request; bind a real Request to the stubbed driver.
  t.mock.method(
    sql.ConnectionPool.prototype,
    "request",
    function (this: sql.ConnectionPool) {
      return new sql.Request(this);
    },
  );
  assert.deepEqual((await downloadReference(7)).bytes, bytes);
  for (const scenario of ["missing", "duplicate", "audit-fail", "race"]) {
    mode = scenario;
    events.length = 0;
    if (scenario === "race" || scenario === "duplicate")
      await assert.rejects(createReference(input, 9), /already in/);
    else await assert.rejects(createReference(input, 9));
    assert.ok(events.includes("rollback"));
    assert.ok(!events.includes("commit"));
    if (scenario === "missing" || scenario === "duplicate")
      assert.ok(!events.includes("insert"));
  }
});

test("unlinked references create and list with empty, null or omitted link projections", async (t) => {
  const bytes = await pdf();
  const input = await referenceInput({ ...body(bytes), recordIds: [] });
  const row: Record<string, unknown> = {
    Id: 8,
    Title: input.title,
    Material: input.material,
    Notes: null,
    FileName: input.fileName,
    Sha256: input.sha256,
    SizeBytes: bytes.length,
    UploadedByUserId: 9,
    UploadedByUserName: null,
    CreatedAt: new Date(),
    RecordIds: "[]",
  };
  const events: string[] = [];
  t.mock.method(
    sql,
    "connect",
    async () => new sql.ConnectionPool("synthetic"),
  );
  t.mock.method(sql.Transaction.prototype, "begin", async () => {
    events.push("begin");
  });
  t.mock.method(sql.Transaction.prototype, "commit", async () => {
    events.push("commit");
  });
  t.mock.method(sql.Transaction.prototype, "rollback", async () => {
    events.push("rollback");
  });
  t.mock.method(
    sql.ConnectionPool.prototype,
    "request",
    function (this: sql.ConnectionPool) {
      return new sql.Request(this);
    },
  );
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      if (statement.includes("sp_getapplock"))
        return { recordset: [{ result: 0 }] };
      if (statement.startsWith("SELECT Id FROM dbo.MarketReferences"))
        return { recordset: [] };
      if (statement.startsWith("INSERT dbo.MarketReferences")) {
        assert.deepEqual(this.parameters.content?.value, bytes);
        return { recordset: [{ Id: 8 }] };
      }
      if (statement.startsWith("SELECT r.Id")) return { recordset: [row] };
      if (statement.startsWith("INSERT dbo.AuditLogs")) {
        const metadata = JSON.parse(String(this.parameters.next?.value));
        assert.deepEqual(metadata.recordIds, []);
        events.push("audit");
        return { recordset: [] };
      }
      throw Error("Unexpected SQL for unlinked upload: " + statement);
    },
  );
  for (const projection of ["[]", null, undefined]) {
    if (projection === undefined) delete row.RecordIds;
    else row.RecordIds = projection;
    events.length = 0;
    const saved = await createReference(input, 9);
    assert.deepEqual(saved.recordIds, []);
    assert.equal(saved.fileName, input.fileName);
    assert.deepEqual(events, ["begin", "audit", "commit"]);
    const listed = await listReferences();
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0]?.recordIds, []);
  }
});
