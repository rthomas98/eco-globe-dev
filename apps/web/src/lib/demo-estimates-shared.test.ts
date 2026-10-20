/**
 * Runs the web labels against the backend-owned shared parser source, so the
 * marker text the backend guards is the same text the UI flags.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasDemoEstimateMarker,
  isDemoEstimateCitation,
  parseDemoEstimateFields,
  readWorkbookRangeCitation,
} from "../../../../packages/shared/src/demo-estimates.mjs";
import { combineDemoEstimateFields, demoEstimateBadgeLabels, listingQuantityLabel } from "./demo-estimate-format.ts";
import { researchFieldStatusLabel } from "./market-record-format.ts";

const read = (text: unknown) => combineDemoEstimateFields(hasDemoEstimateMarker(text), parseDemoEstimateFields(text));

test("a price-only note on a sourced listing keeps its 20 tonne quantity available", () => {
  const fields = read("Zentech wood chips.\nDEMO ESTIMATES (presentation only): price.");
  assert.deepEqual(demoEstimateBadgeLabels(fields), ["Demo price estimate"]);
  assert.equal(listingQuantityLabel("20 t", fields), "20 t available");
});

test("a price and volume note flags both and drops available wording", () => {
  const fields = read("DEMO ESTIMATES (presentation only): price; volume.\nOther notes");
  assert.deepEqual(demoEstimateBadgeLabels(fields), ["Demo price estimate", "Demo volume estimate"]);
  assert.equal(listingQuantityLabel("100 t", fields), "100 t (demo volume estimate)");
});

test("a malformed demo note still blocks submission but shows no field badge", () => {
  const fields = read("DEMO ESTIMATES (presentation only): tbd");
  assert.equal(fields.marker, true);
  assert.deepEqual(demoEstimateBadgeLabels(fields), []);
});

test("ordinary notes and non-strings are not demo", () => {
  for (const text of ["Price is an estimate", "", null, undefined, 42]) assert.equal(read(text).marker, false);
});

test("admin citations: demo fallback vs workbook range", () => {
  assert.equal(researchFieldStatusLabel("estimated", isDemoEstimateCitation("DEMO ESTIMATE (presentation only): 100 USD/t")), "Demo estimate, not verified");
  assert.equal(researchFieldStatusLabel("estimated", isDemoEstimateCitation("Workbook row 12")), "Estimate");
  assert.equal(readWorkbookRangeCitation("WORKBOOK RANGE (unverified research): $80-$120/t. Source: sheet B"), "$80-$120/t");
  assert.equal(readWorkbookRangeCitation("Workbook row 12"), null);
});
