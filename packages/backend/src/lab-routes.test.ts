import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { ApiError } from "./http.js";
import {
  validateRequest,
  validateSelection,
  validatePanel,
  validateReport,
  validatePdf,
  referralOptions,
} from "./lab-validation.js";
import { validateSample, validateSampleTransition } from "./sample-routes.js";
import { handleLabRoute } from "./lab-routes.js";
const request = {
  listingId: 1,
  idempotencyKey: "12345678-1234-1234",
  panelId: null,
  panelVersion: null,
  optionalTestIds: ["processing-concern"],
  turnaround: "standard",
};
function pdf() {
  let data = "%PDF-1.4\n";
  const offsets = [0];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
  ];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(data));
    data += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const start = Buffer.byteLength(data);
  data += "xref\n0 4\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1))
    data += `${String(offset).padStart(10, "0")} 00000 n \n`;
  data += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(data);
}
test("request validation defaults private, canonicalizes retries and rejects forged selections", () => {
  const valid = validateRequest(request);
  assert.equal(valid.sharing, "private");
  assert.equal(valid.sampleRequestId, null);
  validateSelection(valid, null);
  assert.equal(referralOptions.length, 4);
  for (const delta of [
    { listingId: "1" },
    { sampleRequestId: -1 },
    { panelId: 1 },
    { sharing: "public" },
    { optionalTestIds: ["x", "x"] },
    { turnaround: "tomorrow" },
    { companyId: 2 },
    { idempotencyKey: "short" },
  ])
    assert.throws(() => validateRequest({ ...request, ...delta }), ApiError);
  assert.throws(
    () =>
      validateSelection({ ...valid, optionalTestIds: ["draft-assay"] }, null),
    ApiError,
  );
  assert.throws(
    () => validateSelection(valid, { id: 4, version: 2, optionalTests: [] }),
    /scope changed/,
  );
});
test("published panels require lab review and bounded validated mappings", () => {
  const panel = {
    familyCode: "biomass-wood",
    name: "Internal draft",
    materialTypeCodes: [],
    tests: ["Moisture"],
    optionalTests: [],
    status: "draft",
  };
  assert.equal(validatePanel(panel).review, null);
  assert.throws(
    () => validatePanel({ ...panel, status: "published" }),
    /Publication requires/,
  );
  assert.throws(
    () =>
      validatePanel({
        ...panel,
        optionalTests: [{ id: "a", group: "invented", label: "a" }],
      }),
    ApiError,
  );
  assert.throws(
    () =>
      validatePanel({
        ...panel,
        status: "published",
        materialTypeCodes: ["biomass"],
        review: {
          laboratoryName: "Lab",
          reviewedBy: "Person",
          reviewedAt: "2026-02-30",
          evidence: "Review",
        },
      }),
    ApiError,
  );
  assert.equal(
    validatePanel({
      ...panel,
      status: "published",
      materialTypeCodes: ["biomass"],
      review: {
        laboratoryName: "Lab",
        reviewedBy: "Person",
        reviewedAt: "2026-01-01",
        evidence: "Signed review",
      },
    }).status,
    "published",
  );
});
test("PDF bytes reject fake, corrupt, active and oversized documents", async () => {
  const valid = pdf();
  assert.deepEqual(await validatePdf(valid.toString("base64")), valid);
  for (const bad of [
    Buffer.from("%PDF-1.4\nFake\n%%EOF"),
    Buffer.from(
      valid.toString().replace("/Type /Catalog", "/JavaScript /Catalog"),
    ),
    Buffer.alloc(5 * 1024 * 1024 + 1, 65),
  ])
    await assert.rejects(() => validatePdf(bad.toString("base64")), ApiError);
  await assert.rejects(() => validatePdf("not-base64"), ApiError);
});
test("reports require actual bounded results, dates and safe filenames", async () => {
  const report = {
    laboratoryName: "Fixture lab",
    batchReference: "Batch-1",
    sampleDate: "2026-01-01",
    reportDate: "2026-01-02",
    results: [{ label: "Moisture", value: "8.2", unit: "%" }],
    fileName: "batch.pdf",
    contentBase64: pdf().toString("base64"),
    published: false,
  };
  assert.equal((await validateReport(report)).results[0]?.value, "8.2");
  for (const delta of [
    { results: [] },
    { results: [{ label: "x", value: 1, unit: "%" }] },
    { fileName: "../x.pdf" },
    { reportDate: "2025-12-01" },
    { published: "true" },
    { sampleDate: "2999-01-01" },
    { laboratoryName: "" },
  ])
    await assert.rejects(
      () => validateReport({ ...report, ...delta }),
      ApiError,
    );
});
test("sample port validates quantities and enforces buyer/seller transition ownership", () => {
  assert.equal(
    validateSample({ listingId: 1, idempotencyKey: "12345678-12345678" })
      .quantityLb,
    5,
  );
  for (const quantityLb of [0, -1, 50.1, 1.001, "5", Infinity])
    assert.throws(() => validateSample({ listingId: 1, quantityLb }), ApiError);
  validateSampleTransition("requested", "accepted", "seller");
  validateSampleTransition("shipped", "received", "buyer");
  assert.throws(
    () => validateSampleTransition("requested", "accepted", "buyer"),
    ApiError,
  );
  assert.throws(
    () => validateSampleTransition("requested", "received", "admin"),
    ApiError,
  );
});
test("lab private and internal routes reject missing bearer before database access", async () => {
  // Real HTTP boundary: no SQL configured or contacted by this test.
  const server = createServer(async (req, res) => {
    try {
      await handleLabRoute(
        req,
        res,
        new URL(req.url ?? "/", "http://localhost"),
      );
    } catch (error) {
      res.statusCode = error instanceof ApiError ? error.status : 500;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    for (const path of [
      "/api/admin/lab/panels",
      "/api/admin/lab/assignees",
      "/api/lab/requests",
    ]) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("PDF parser accepts compressed object streams and binary data but rejects active parsed names", async () => {
  const doc = await PDFDocument.create();
  doc.addPage().drawText("Synthetic laboratory report");
  const binary = doc.context.flateStream(
    Buffer.from("#4A harmless binary ".repeat(20000)),
  );
  doc.catalog.set(PDFName.of("SyntheticData"), doc.context.register(binary));
  for (const useObjectStreams of [false, true]) {
    const bytes = Buffer.from(await doc.save({ useObjectStreams }));
    assert.deepEqual(await validatePdf(bytes.toString("base64")), bytes);
  }
  doc.catalog.set(
    PDFName.of("OpenAction"),
    doc.context.obj({
      S: PDFName.of("JavaScript"),
      JS: PDFString.of("app.alert('test')"),
    }),
  );
  await assert.rejects(
    () =>
      doc
        .save()
        .then((bytes) => validatePdf(Buffer.from(bytes).toString("base64"))),
    ApiError,
  );
});
