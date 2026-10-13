import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressPurposeLabel,
  csvCell,
  describeResearchPrice,
  describeResearchVolume,
  fieldStatusLabel,
  formatAddressLine,
  formatDecimalString,
  formatReviewStamp,
  isDecimalString,
  parseOptionalDecimalInput,
  safeHttpUrl,
  sourceCheckedLabel,
  sourceRecordTypeLabel,
} from "./market-record-format.ts";

const price = (value: string | null, currencyCode: string | null = "USD", perUnit: string | null = "t") => ({
  status: "estimated" as const,
  value,
  currencyCode,
  perUnit,
});

test("unknown research values are never shown as zero", () => {
  assert.equal(isDecimalString(null), false);
  assert.equal(isDecimalString(""), false);
  assert.equal(isDecimalString("abc"), false);
  assert.equal(isDecimalString("1e5"), false);
  assert.equal(describeResearchPrice(price("1,000")).kind, "unknown");
  assert.equal(describeResearchPrice(price(null)).label, "Unknown");
  assert.equal(describeResearchPrice(null).kind, "unknown");
  assert.equal(
    describeResearchVolume({ status: "unknown", value: null, unit: "t/yr", period: "annual" }).label,
    "Unknown",
  );
});

test("an explicit zero research price stays a zero, distinct from unknown", () => {
  const zero = describeResearchPrice(price("0"));
  assert.equal(zero.kind, "zero");
  assert.equal(zero.label, "$0.00/t");
});

test("a negative research price is a seller-paid gate fee, not a negative price", () => {
  const fee = describeResearchPrice(price("-45.5"));
  assert.equal(fee.kind, "gate_fee");
  assert.equal(fee.label, "Gate fee $45.50/t (seller pays)");
  assert.ok(!fee.label.includes("-") && !fee.label.includes("−"));
  const eur = describeResearchPrice(price("700", "EUR", "gal"));
  assert.equal(eur.kind, "price");
  assert.equal(eur.label, "€700.00/gal");
});

test("volumes read as annual capacity, never stock", () => {
  const annual = describeResearchVolume({ status: "estimated", value: "12000", unit: "t/yr", period: "annual" });
  assert.equal(annual.label, "12,000 t/yr (annual)");
  const tonnes = describeResearchVolume({ status: "estimated", value: "500", unit: "t", period: "annual" });
  assert.equal(tonnes.label, "500 t per year (annual)");
  const unspecified = describeResearchVolume({ status: "unknown", value: "40", unit: "t", period: "unspecified" });
  assert.equal(unspecified.label, "40 t (period not stated)");
  for (const label of [annual.label, tonnes.label, unspecified.label]) {
    assert.ok(!/available|in stock/i.test(label));
  }
});

test("form decimals keep blanks null and preserve digits", () => {
  assert.deepEqual(parseOptionalDecimalInput("  ", { allowNegative: true }), { ok: true, value: null });
  assert.deepEqual(parseOptionalDecimalInput("0", { allowNegative: false }), { ok: true, value: "0" });
  assert.deepEqual(parseOptionalDecimalInput("12,000.50", { allowNegative: false }), { ok: true, value: "12000.50" });
  assert.deepEqual(parseOptionalDecimalInput("-0", { allowNegative: true }), { ok: true, value: "0" });
  assert.deepEqual(parseOptionalDecimalInput("-0.00", { allowNegative: true }), { ok: true, value: "0.00" });
  assert.deepEqual(parseOptionalDecimalInput("007", { allowNegative: false }), { ok: true, value: "7" });
  assert.equal(parseOptionalDecimalInput("-5", { allowNegative: false }).ok, false);
  assert.equal(parseOptionalDecimalInput("1e5", { allowNegative: true }).ok, false);
  assert.equal(parseOptionalDecimalInput("=1+1", { allowNegative: true }).ok, false);
});

test("commas are accepted only as thousands grouping, never stripped blindly", () => {
  assert.deepEqual(parseOptionalDecimalInput("1,234,567", { allowNegative: false }), { ok: true, value: "1234567" });
  for (const bad of ["12,34", "1,2345", ",123", "1,,000", "12,000,5"]) {
    assert.equal(parseOptionalDecimalInput(bad, { allowNegative: false }).ok, false, bad);
  }
});

test("form decimals enforce scale and integer digits instead of rounding", () => {
  const price = { allowNegative: false, maxScale: 2, maxIntegerDigits: 16 };
  assert.equal(parseOptionalDecimalInput("1.234", price).ok, false);
  assert.deepEqual(parseOptionalDecimalInput("9999999999999999.99", price), {
    ok: true,
    value: "9999999999999999.99",
  });
  assert.equal(parseOptionalDecimalInput("12345678901234567", price).ok, false);
});

test("large 18-digit decimals are formatted exactly, never rounded", () => {
  assert.equal(formatDecimalString("9999999999999999.99"), "9,999,999,999,999,999.99");
  assert.equal(formatDecimalString("123456789012345.678"), "123,456,789,012,345.678");
  assert.equal(formatDecimalString("0.5", 2), "0.50");
  assert.equal(describeResearchPrice(price("9007199254740993.01")).label, "$9,007,199,254,740,993.01/t");
  assert.equal(
    describeResearchVolume({ status: "estimated", value: "123456789012345.678", unit: "t", period: "annual" }).label,
    "123,456,789,012,345.678 t per year (annual)",
  );
  assert.equal(describeResearchPrice(price("12.5", "CAD")).label, "CAD 12.50/t");
});

test("headquarters and office addresses are never pickup sites", () => {
  assert.equal(addressPurposeLabel("headquarters"), "Headquarters, not a pickup site");
  assert.equal(addressPurposeLabel("office"), "Office, not a pickup site");
  assert.equal(addressPurposeLabel("unknown"), "Address role unknown");
  assert.equal(addressPurposeLabel(null), "Address role unknown");
});

test("address lines omit missing parts and keep postal codes as text", () => {
  assert.equal(
    formatAddressLine({
      street: "1 Mill Rd",
      city: "Boston",
      stateProvince: "MA",
      postalCode: "02134",
      countryCode: "US",
      purpose: "facility",
    }),
    "1 Mill Rd, Boston, MA 02134, US",
  );
  assert.equal(
    formatAddressLine({ street: null, city: null, stateProvince: null, postalCode: null, countryCode: null, purpose: "unknown" }),
    "Unknown",
  );
});

test("checked flag and record type are separate labels", () => {
  assert.equal(sourceCheckedLabel(true), "Source marked checked");
  assert.equal(sourceCheckedLabel(false), "Source not marked checked");
  assert.equal(sourceCheckedLabel(null), "Source check unknown");
  for (const label of [sourceCheckedLabel(true), sourceCheckedLabel(false), sourceCheckedLabel(null)]) {
    assert.ok(!/confirm|verified|kyc/i.test(label), label);
  }
  assert.equal(sourceRecordTypeLabel("confirmed_stream"), "Confirmed stream");
  assert.equal(sourceRecordTypeLabel("new_code"), "New code");
  assert.equal(sourceRecordTypeLabel(null), "Type not recorded");
  assert.equal(fieldStatusLabel("unknown"), "Not confirmed");
  assert.equal(fieldStatusLabel("estimated"), "Estimate");
  assert.equal(fieldStatusLabel("confirmed"), "Confirmed");
});

test("source links allow only absolute http(s) URLs", () => {
  assert.equal(safeHttpUrl("https://example.org/report"), "https://example.org/report");
  assert.equal(safeHttpUrl(" http://example.org "), "http://example.org/");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hi"), null);
  assert.equal(safeHttpUrl("//example.org"), null);
  assert.equal(safeHttpUrl("example.org"), null);
  assert.equal(safeHttpUrl(null), null);
});

test("CSV cells cannot become formulas and numbers stay numeric", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("-45"), "'-45");
  assert.equal(csvCell(-45), "-45");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell("a,b"), "\"a,b\"");
});

test("review stamps never invent a reviewer or date", () => {
  assert.equal(formatReviewStamp(null, null), "Not reviewed");
  assert.equal(formatReviewStamp(null, "2026-10-01T00:00:00Z").startsWith("Reviewer unknown · "), true);
  assert.equal(formatReviewStamp("A. Admin", null), "A. Admin · date unknown");
});
