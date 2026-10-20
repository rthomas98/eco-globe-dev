import assert from "node:assert/strict";
import test from "node:test";
import { hasDemoEstimateMarker, isDemoEstimateCitation, parseDemoEstimateFields, readWorkbookRangeCitation } from "../../shared/src/demo-estimates.mjs";
import { parseWantedWrite } from "./wanted-listing-domain.js";

const marker = "DEMO ESTIMATES (presentation only): price; volume.";
test("field labels preserve the sourced quantity when only price is a demo estimate", () => {
  assert.deepEqual(parseDemoEstimateFields("DEMO ESTIMATES (presentation only): price.\nOriginal 20 tonne requirement"), { price: true, volume: false });
  assert.deepEqual(parseDemoEstimateFields(marker), { price: true, volume: true });
  for (const value of [null, undefined, {}, "Workbook value: 20 tonnes", "A demo price was discussed."])
    assert.deepEqual(parseDemoEstimateFields(value), { price: false, volume: false });
});
test("prepended notes and malformed marker fields do not bypass publication detection", () => {
  assert.equal(hasDemoEstimateMarker("Notes first\r\n  " + marker), true);
  assert.equal(hasDemoEstimateMarker("DEMO ESTIMATES (presentation only): unknown."), true);
  assert.equal(hasDemoEstimateMarker("normal source notes"), false);
});
test("workbook estimates and workbook ranges are distinct from demo fallbacks", () => {
  assert.equal(isDemoEstimateCitation("DEMO ESTIMATE (presentation only): USD 100 per tonne"), true);
  assert.equal(isDemoEstimateCitation("WORKBOOK VALUE (unverified research): USD 300/t"), false);
  assert.equal(readWorkbookRangeCitation("WORKBOOK RANGE (unverified research): 17,000–22,000 t/yr. Source: Cabot. No midpoint inferred."), "17,000–22,000 t/yr");
  assert.equal(readWorkbookRangeCitation("Source questionnaire"), null);
});
test("a complete buyer request with demo estimates can save as draft but cannot post or resume as open", () => {
  const body = { title: "Private demonstration", materialTypeCode: "other", quantity: 100, quantityUnit: "tonne", targetPricePerUnit: 100, currencyCode: "USD", countryCode: "US", notes: marker, statusCode: "draft" };
  const previous = parseWantedWrite(body);
  assert.equal(previous.isDraft, true);
  assert.equal(parseWantedWrite({ notes: marker + "\nEdited context" }, previous).isDraft, true);
  assert.throws(() => parseWantedWrite({ ...body, statusCode: "open" }), /Replace demo estimates/);
  assert.throws(() => parseWantedWrite({ statusCode: "open" }, previous), /Replace demo estimates/);
  assert.throws(() => parseWantedWrite({ isOpen: true }, previous), /Replace demo estimates|Invalid request transition/);
  assert.equal(parseWantedWrite({ statusCode: "open", notes: "Supplier-confirmed requirement", quantity: 20, targetPricePerUnit: 90 }, previous).isOpen, true);
});
