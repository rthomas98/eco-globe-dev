import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canChangeSharing,
  cleanHeadlineResults,
  describeRequester,
  describeRequestProgress,
  describeTestedBadge,
  formatHeadlineResult,
  isValidIdempotencyKey,
  makeIdempotencyKey,
  panelPublishBlockers,
  slugifyTestCode,
  toLabRequestScope,
  validateLabForm,
  validateReportForm,
  EMPTY_LAB_FORM,
} from "./lab-testing.ts";

test("form requires a turnaround choice and explicit consent when sharing", () => {
  assert.deepEqual(validateLabForm(EMPTY_LAB_FORM), []);
  const noTurnaround = validateLabForm({ ...EMPTY_LAB_FORM, turnaround: null });
  assert.equal(noTurnaround[0]?.field, "turnaround");
  const sharedNoConsent = validateLabForm({ ...EMPTY_LAB_FORM, sharing: "shared" });
  assert.equal(sharedNoConsent[0]?.field, "consentToShare");
  const sharedConsent = validateLabForm({ ...EMPTY_LAB_FORM, sharing: "shared", consentToShare: true });
  assert.deepEqual(sharedConsent, []);
  const tooLong = validateLabForm({ ...EMPTY_LAB_FORM, concerns: "x".repeat(4001) });
  assert.equal(tooLong[0]?.field, "concerns");
});

test("scope is deduplicated, trimmed, and consent never leaks into private requests", () => {
  const scope = toLabRequestScope({
    optionalTestIds: ["safety-concern", "processing-concern", "processing-concern", " ash "],
    concerns: "  slagging  ",
    turnaround: "standard",
    sharing: "private",
    consentToShare: true,
  });
  assert.deepEqual(scope.optionalTestIds, ["ash", "processing-concern", "safety-concern"]);
  assert.equal(scope.concerns, "slagging");
  assert.equal(scope.consentToShare, false);
  assert.equal(toLabRequestScope({ ...EMPTY_LAB_FORM, concerns: "   " }).concerns, "");
});

test("idempotency keys are unique and uuid shaped", () => {
  const a = makeIdempotencyKey();
  const b = makeIdempotencyKey();
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const fallback = makeIdempotencyKey(() => 0.5);
  assert.match(fallback, /^[0-9a-f-]{36}$/);
  assert.ok(isValidIdempotencyKey(a));
  assert.ok(!isValidIdempotencyKey("short"));
});

test("tested badge names the laboratory and date and carries batch context", () => {
  const badge = describeTestedBadge({
    laboratoryName: "Example Analytical",
    reportDate: "2026-08-20",
    batchReference: "B-4471",
    sampleDate: "2026-08-14",
  });
  assert.equal(badge.headline, "Independently tested");
  assert.equal(badge.detail, "Example Analytical, Aug 20, 2026");
  assert.equal(badge.batch, "Batch B-4471 · sample drawn Aug 14, 2026");
  assert.doesNotMatch(JSON.stringify(badge), /certified/i);
});

test("progress copy never promises cost or duration", () => {
  for (const status of ["requested", "reviewing", "awaiting_sample", "testing", "completed", "cancelled"]) {
    const copy = describeRequestProgress(status);
    assert.ok(copy.length > 0);
    assert.doesNotMatch(copy, /\$|\bdays?\b|\bweeks?\b/i);
  }
});

test("sharing consent can be changed for every status, including cancelled", () => {
  // Regression: a cancelled request may still carry a published, shared report;
  // the requester must always be able to withdraw (or grant) sharing.
  for (const status of ["requested", "reviewing", "awaiting_sample", "testing", "completed", "cancelled", undefined]) {
    assert.equal(canChangeSharing(status), true, `status ${status}`);
  }
});

test("headline results format with units and are cleaned", () => {
  assert.equal(formatHeadlineResult({ label: "Moisture", value: "8.4", unit: "%" }), "8.4%");
  assert.equal(formatHeadlineResult({ label: "Calorific value", value: "17.9", unit: "MJ/kg" }), "17.9 MJ/kg");
  assert.equal(formatHeadlineResult({ label: "pH", value: "7.1", unit: "" }), "7.1");
  const cleaned = cleanHeadlineResults([
    { label: " Ash ", value: " 3.1 ", unit: " % " },
    { label: "", value: "", unit: "" },
  ]);
  assert.deepEqual(cleaned, [{ label: "Ash", value: "3.1", unit: "%" }]);
  assert.equal(cleanHeadlineResults([{ label: "pH", value: "7", unit: " " }])[0]?.unit, "");
});

test("report form requires real metadata, results and a pdf within the limit", () => {
  const base = {
    laboratoryName: "Example Analytical",
    batchReference: "B-1",
    sampleDate: "2026-08-14",
    reportDate: "2026-08-20",
    headlineResults: [{ label: "Moisture", value: "8.4", unit: "%" }],
    fileName: "report.pdf",
    fileSize: 1024,
    fileIsPdf: true,
  };
  assert.deepEqual(validateReportForm(base, 10 * 1024 * 1024), []);
  const fields = validateReportForm(
    { ...base, laboratoryName: " ", batchReference: "", sampleDate: "bad", reportDate: "", headlineResults: [], fileName: null, fileSize: null, fileIsPdf: null },
    1024,
  ).map((e) => e.field);
  assert.deepEqual(fields, ["laboratoryName", "batchReference", "sampleDate", "reportDate", "headlineResults", "file"]);
  assert.equal(validateReportForm({ ...base, sampleDate: "2999-01-01", reportDate: "2999-01-02" }, 1024 * 1024)[0]?.field, "sampleDate");
  assert.equal(validateReportForm({ ...base, fileName: "bad;name.pdf" }, 1024 * 1024)[0]?.field, "file");
  assert.equal(
    validateReportForm({ ...base, headlineResults: Array.from({ length: 5 }, (_, i) => ({ label: `r${i}`, value: "1", unit: "" })) }, 1024 * 1024)[0]?.field,
    "headlineResults",
  );
  assert.equal(validateReportForm({ ...base, reportDate: "2026-08-01" }, 1024 * 1024)[0]?.field, "reportDate");
  assert.equal(validateReportForm({ ...base, fileIsPdf: false }, 1024 * 1024)[0]?.field, "file");
  assert.equal(validateReportForm({ ...base, fileSize: 2048 }, 1024)[0]?.field, "file");
  assert.equal(
    validateReportForm({ ...base, headlineResults: [{ label: "Moisture", value: "", unit: "" }] }, 1024 * 1024)[0]?.field,
    "headlineResults",
  );
});

test("draft panels cannot publish without laboratory review metadata", () => {
  const blockers = panelPublishBlockers({ review: null, tests: [], materialTypeCodes: [] });
  assert.equal(blockers.length, 6);
  const ready = panelPublishBlockers({
    review: { laboratoryName: "Example Analytical", reviewedBy: "Lab reviewer", reviewedAt: "2026-09-01", evidence: "Removed pesticide residues from the default panel." },
    tests: ["Moisture"],
    materialTypeCodes: ["industrial_byproduct"],
  });
  assert.deepEqual(ready, []);
  assert.equal(slugifyTestCode("Chlorine & sulphur"), "chlorine_sulphur");
});

test("requester line prefers real identity and falls back to the company id", () => {
  assert.equal(describeRequester({ companyId: 501 }), "Company #501");
  assert.equal(describeRequester({ companyId: 501, companyName: "AgriCorp", requestedByName: "Ana Sanz", requestedByEmail: "ana@example.test" }), "AgriCorp — Ana Sanz · ana@example.test");
  assert.equal(describeRequester({ companyId: 501, companyName: " ", requestedByEmail: "ana@example.test" }), "Company #501 — ana@example.test");
});
