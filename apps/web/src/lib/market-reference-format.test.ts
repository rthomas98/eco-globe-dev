import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REFERENCE_BYTES,
  filterReferences,
  formatReferenceSize,
  parseReferenceRecordIds,
  readReferenceRecordFilter,
  referenceFileProblem,
} from "./market-reference-format.ts";

const reference = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Gypsum handling study",
  material: "Industrial black gypsum",
  notes: null,
  fileName: "Étude (original).pdf",
  sha256: "a".repeat(64),
  sizeBytes: 2048,
  uploadedByUserId: 4,
  uploadedByUserName: "Admin",
  createdAt: "2026-10-14T12:00:00.000Z",
  recordIds: [],
  ...overrides,
});

test("client file limit stays below the hosted proxy body cap once base64 encoded", () => {
  assert.equal(MAX_REFERENCE_BYTES, 3 * 1024 * 1024);
  assert.ok((MAX_REFERENCE_BYTES * 4) / 3 + 4096 < 4.5 * 1000 * 1000);
});

test("only non-empty, bounded, safely named PDFs pass the pre-upload check", () => {
  const pdf = { name: "Study.PDF", size: 10, type: "application/pdf" };
  assert.equal(referenceFileProblem(pdf), null);
  assert.equal(referenceFileProblem({ ...pdf, type: "" }), null);
  assert.equal(referenceFileProblem({ ...pdf, size: MAX_REFERENCE_BYTES }), null);
  assert.match(referenceFileProblem({ ...pdf, size: MAX_REFERENCE_BYTES + 1 })!, /limit is 3\.0 MB/);
  assert.match(referenceFileProblem({ ...pdf, size: 0 })!, /empty/);
  assert.match(referenceFileProblem({ ...pdf, name: "study.docx" })!, /PDF/);
  assert.match(referenceFileProblem({ ...pdf, name: ".pdf" })!, /PDF/);
  assert.match(referenceFileProblem({ ...pdf, type: "text/html" })!, /not a PDF/);
  assert.match(referenceFileProblem({ ...pdf, name: `${"x".repeat(240)}.pdf` })!, /longer than 240/);
  assert.match(referenceFileProblem({ ...pdf, name: "a\u0007b.pdf" })!, /cannot be stored/);
});

test("record IDs parse strictly and never merge duplicates silently", () => {
  assert.deepEqual(parseReferenceRecordIds(""), { ids: [], error: null });
  assert.deepEqual(parseReferenceRecordIds(" 12, #40\n7 "), { ids: [12, 40, 7], error: null });
  for (const bad of ["0", "01", "1.5", "-3", "abc", "2147483648", "12a"])
    assert.ok(parseReferenceRecordIds(bad).error, bad);
  assert.match(parseReferenceRecordIds("3, 3").error!, /more than once/);
  const many = Array.from({ length: 101 }, (_, i) => i + 1).join(",");
  assert.match(parseReferenceRecordIds(many).error!, /at most 100/);
});

test("search matches every term across title, material, file name and notes", () => {
  const items = [
    reference(),
    reference({ id: 2, title: "Lime note", material: "Lime", fileName: "lime.pdf", notes: "Kiln dust context" }),
  ];
  assert.equal(filterReferences(items, "").length, 2);
  assert.deepEqual(filterReferences(items, "GYPSUM").map((r) => r.id), [1]);
  assert.deepEqual(filterReferences(items, "kiln lime").map((r) => r.id), [2]);
  assert.deepEqual(filterReferences(items, "étude").map((r) => r.id), [1]);
  assert.deepEqual(filterReferences(items, "kiln gypsum"), []);
});

test("sizes and the record filter are formatted defensively", () => {
  assert.equal(formatReferenceSize(512), "512 B");
  assert.equal(formatReferenceSize(2048), "2.0 KB");
  assert.equal(formatReferenceSize(3 * 1024 * 1024), "3.0 MB");
  assert.equal(formatReferenceSize(Number.NaN), "Unknown size");
  assert.equal(readReferenceRecordFilter("12"), 12);
  for (const bad of [null, "", "0", "01", "x", "2147483648"]) assert.equal(readReferenceRecordFilter(bad), null);
});
