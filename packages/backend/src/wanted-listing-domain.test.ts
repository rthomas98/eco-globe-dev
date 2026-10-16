import assert from "node:assert/strict";
import test from "node:test";
import { parseWantedWrite, wantedStatus } from "./wanted-listing-domain.js";
import { ApiError } from "./http.js";
const draft = () =>
  parseWantedWrite({
    title: "Source request",
    materialTypeCode: "other",
    statusCode: "draft",
  });
test("minimal draft preserves unknown facts as null", () => {
  const value = draft();
  for (const key of [
    "quantity",
    "quantityUnit",
    "currencyCode",
    "targetPricePerUnit",
    "countryCode",
    "needByDate",
  ] as const)
    assert.equal(value[key], null);
  assert.equal(value.isOpen, false);
  assert.equal(wantedStatus(value), "draft");
});
test("draft edits merge omissions and explicitly clear nullable fields", () => {
  const saved = parseWantedWrite(
    { quantity: 20, quantityUnit: "tonne", notes: "Source notes" },
    draft(),
  );
  const cleared = parseWantedWrite(
    { quantity: null, quantityUnit: null },
    saved,
  );
  assert.equal(cleared.quantity, null);
  assert.equal(cleared.quantityUnit, null);
  assert.equal(cleared.notes, "Source notes");
});
test("publish validates saved state and requires no fabricated defaults or date", () => {
  assert.throws(
    () => parseWantedWrite({ statusCode: "open" }, draft()),
    ApiError,
  );
  const saved = parseWantedWrite(
    {
      quantity: 20,
      quantityUnit: "tonne",
      countryCode: "us",
      currencyCode: "usd",
    },
    draft(),
  );
  const published = parseWantedWrite({ statusCode: "open" }, saved);
  assert.equal(published.needByDate, null);
  assert.equal(published.countryCode, "US");
  assert.equal(published.isOpen, true);
});
test("legacy immediate post defaults remain restricted to creation", () => {
  const value = parseWantedWrite({
    title: "Legacy",
    materialTypeCode: "other",
    quantity: 20,
    countryCode: "US",
  });
  assert.equal(value.quantityUnit, "tons");
  assert.equal(value.currencyCode, "USD");
  assert.equal(value.needByDate, null);
});
test("boundary rejects malformed fields, impossible dates, coercion and precision loss", () => {
  for (const patch of [
    { title: null },
    { materialTypeCode: "" },
    { statusCode: ["open"] },
    { quantity: "20" },
    { quantity: 0 },
    { quantity: -1 },
    { quantity: Infinity },
    { quantity: 1.0001 },
    { quantity: 0.0000001 },
    { targetPricePerUnit: 1.001 },
    { countryCode: "USA" },
    { currencyCode: "U1D" },
    { needByDate: "2026-02-30" },
    { needByDate: "0000-01-01" },
    { needByDate: "2026-13-01" },
    { quantityUnit: "unknown" },
    { buyerCompanyId: 42 },
    { isOpen: "false" },
  ])
    assert.throws(
      () => parseWantedWrite(patch, draft()),
      ApiError,
      JSON.stringify(patch),
    );
  assert.throws(() => parseWantedWrite([]), ApiError);
  assert.equal(
    parseWantedWrite({ needByDate: "2028-02-29" }, draft()).needByDate,
    "2028-02-29",
  );
});
test("published lifecycle and accepted closure cannot become private or reopen", () => {
  const open = parseWantedWrite({
    title: "Legacy",
    materialTypeCode: "other",
    quantity: 20,
    countryCode: "US",
  });
  assert.throws(
    () => parseWantedWrite({ statusCode: "draft" }, open),
    ApiError,
  );
  assert.throws(
    () => parseWantedWrite({ statusCode: "open", isOpen: false }, open),
    ApiError,
  );
  const closed = parseWantedWrite({ isOpen: false }, open);
  assert.equal(wantedStatus(closed), "closed");
  assert.equal(parseWantedWrite({ isOpen: true }, closed).isOpen, true);
  const accepted = { ...open, acceptedCount: 1 };
  assert.equal(wantedStatus(accepted), "closed");
  assert.throws(() => parseWantedWrite({ isOpen: true }, accepted), ApiError);
  assert.equal(
    parseWantedWrite({ notes: "Owner note" }, accepted).isOpen,
    true,
  );
  assert.throws(() => parseWantedWrite({ isOpen: false }, draft()), ApiError);
});

test("explicit zero target price is preserved while absent price remains null", () => {
  assert.equal(draft().targetPricePerUnit, null);
  assert.equal(
    parseWantedWrite({ targetPricePerUnit: 0 }, draft()).targetPricePerUnit,
    0,
  );
  assert.throws(
    () => parseWantedWrite({ targetPricePerUnit: -1 }, draft()),
    ApiError,
  );
});

test("nonblank source notes survive save and omission verbatim", () => {
  const source = "  Workbook source note.\n  ";
  const saved = parseWantedWrite({ notes: source }, draft());
  assert.equal(saved.notes, source);
  assert.equal(
    parseWantedWrite({ title: "Edited title" }, saved).notes,
    source,
  );
  assert.equal(parseWantedWrite({ notes: "  " }, saved).notes, null);
  assert.equal(parseWantedWrite({ notes: null }, saved).notes, null);
});
