import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RFQ_CATEGORIES,
  initialRfqFormState,
  rfqCategoryOptions,
  rfqFormInput,
  validateRfqDraft,
  validateRfqForm,
  withRecurrence,
  type RfqDraft,
  type RfqFormInput,
  type RfqResumeSource,
} from "./rfq-request.ts";

const base: RfqDraft = {
  title: "Rice husk",
  quantity: "50",
  targetPrice: "",
  countryCode: "US",
  stateProvince: "LA",
};

test("valid request keeps the entered values", () => {
  const result = validateRfqDraft({ ...base, targetPrice: "425.5", countryCode: "us" });
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.value, {
    title: "Rice husk",
    quantity: 50,
    targetPricePerUnit: 425.5,
    countryCode: "US",
    stateProvince: "LA",
  });
});

test("invalid quantity is an error, never replaced by 1", () => {
  for (const quantity of ["", "abc", "0", "-3"]) {
    const result = validateRfqDraft({ ...base, quantity });
    assert.equal(result.ok, false, quantity);
  }
  const ok = validateRfqDraft({ ...base, quantity: "1,250.5" });
  assert.equal(ok.ok && ok.value.quantity, 1250.5);
});

test("target price is optional but must be a plain number", () => {
  const blank = validateRfqDraft(base);
  assert.equal(blank.ok && blank.value.targetPricePerUnit, undefined);
  assert.equal(validateRfqDraft({ ...base, targetPrice: "$400-450 / ton" }).ok, false);
  assert.equal(validateRfqDraft({ ...base, targetPrice: "-1" }).ok, false);
});

test("delivery country is required, never assumed", () => {
  assert.equal(validateRfqDraft({ ...base, countryCode: "" }).ok, false);
  assert.equal(validateRfqDraft({ ...base, countryCode: "70" }).ok, false);
  const noRegion = validateRfqDraft({ ...base, countryCode: "NL", stateProvince: " " });
  assert.ok(noRegion.ok);
  assert.equal(noRegion.ok && noRegion.value.stateProvince, undefined);
});

test("title is required", () => {
  assert.equal(validateRfqDraft({ ...base, title: "  " }).ok, false);
});

const form: RfqFormInput = {
  ...base,
  materialTypeCode: "other",
  unit: "tonne",
  currencyCode: "USD",
  needBy: "2026-12-01",
  notes: "",
};
const emptyDraft: RfqFormInput = {
  title: "Fuel requirement (unconfirmed)",
  quantity: "",
  targetPrice: "",
  countryCode: "",
  stateProvince: "",
  materialTypeCode: "other",
  unit: "",
  currencyCode: "",
  needBy: "",
  notes: "  Source note, kept verbatim.  ",
};

test("a draft keeps absent values null, never zero or a default", () => {
  const result = validateRfqForm(emptyDraft, "draft");
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.value, {
    title: "Fuel requirement (unconfirmed)",
    materialTypeCode: "other",
    quantity: null,
    quantityUnit: null,
    targetPricePerUnit: null,
    currencyCode: null,
    countryCode: null,
    stateProvince: null,
    needByDate: null,
    notes: "  Source note, kept verbatim.  ",
  });
});

test("a draft still rejects invalid entered values and needs a title", () => {
  assert.equal(validateRfqForm({ ...emptyDraft, title: " " }, "draft").ok, false);
  assert.equal(validateRfqForm({ ...emptyDraft, materialTypeCode: "" }, "draft").ok, false);
  assert.equal(validateRfqForm({ ...emptyDraft, quantity: "0" }, "draft").ok, false);
  assert.equal(validateRfqForm({ ...emptyDraft, countryCode: "USA" }, "draft").ok, false);
  assert.equal(validateRfqForm({ ...emptyDraft, needBy: "soon" }, "draft").ok, false);
  const partial = validateRfqForm({ ...emptyDraft, quantity: "20", unit: "tonne" }, "draft");
  assert.equal(partial.ok && partial.value.quantity, 20);
});

test("publishing keeps the existing prerequisites plus unit and currency", () => {
  assert.ok(validateRfqForm(form, "publish").ok);
  assert.equal(validateRfqForm(emptyDraft, "publish").ok, false);
  assert.equal(validateRfqForm({ ...form, quantity: "" }, "publish").ok, false);
  assert.equal(validateRfqForm({ ...form, countryCode: "" }, "publish").ok, false);
  assert.equal(validateRfqForm({ ...form, needBy: "" }, "publish").ok, false);
  assert.equal(validateRfqForm({ ...form, unit: "" }, "publish").ok, false);
  assert.equal(validateRfqForm({ ...form, currencyCode: "" }, "publish").ok, false);
});

test("cadence is added once and an unspecified cadence leaves notes untouched", () => {
  assert.equal(withRecurrence("  Seeded note ", ""), "  Seeded note ");
  assert.equal(withRecurrence("Spec", "Monthly"), "Spec\nDelivery cadence: Monthly");
  assert.equal(withRecurrence("Spec\nDelivery cadence: Monthly", "Monthly"), "Spec\nDelivery cadence: Monthly");
  assert.equal(withRecurrence("", "Weekly"), "Delivery cadence: Weekly");
});

test("a new form preselects no unit, currency, facility or cadence", () => {
  const state = initialRfqFormState();
  assert.equal(state.unit, "");
  assert.equal(state.currencyCode, "");
  assert.equal(state.facilityChoice, "");
  assert.equal(state.recurrence, "");
  assert.equal(state.category, "Other");
});

test("an untouched new form with only a title saves a draft of nulls", () => {
  const state = { ...initialRfqFormState(), title: "Fuel requirement (unconfirmed)" };
  // Saved facilities exist but none was chosen, so none is passed.
  const result = validateRfqForm(rfqFormInput(state, RFQ_CATEGORIES, undefined), "draft");
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.value, {
    title: "Fuel requirement (unconfirmed)",
    materialTypeCode: "other",
    quantity: null,
    quantityUnit: null,
    targetPricePerUnit: null,
    currencyCode: null,
    countryCode: null,
    stateProvince: null,
    needByDate: null,
    notes: null,
  });
  assert.equal(validateRfqForm(rfqFormInput(state, RFQ_CATEGORIES), "publish").ok, false);
});

test("an explicitly chosen facility or typed country is used, nothing else", () => {
  const state = { ...initialRfqFormState(), title: "Rice husk", facilityChoice: "7" };
  const input = rfqFormInput(state, RFQ_CATEGORIES, { countryCode: "US", stateProvince: "LA" });
  assert.equal(input.countryCode, "US");
  assert.equal(input.stateProvince, "LA");
  const typed = rfqFormInput({ ...state, facilityChoice: "manual", manualCountry: "NL", manualRegion: "" }, RFQ_CATEGORIES);
  assert.equal(typed.countryCode, "NL");
  // Typed values are ignored unless the manual option is selected.
  const unset = rfqFormInput({ ...state, facilityChoice: "", manualCountry: "NL" }, RFQ_CATEGORIES);
  assert.equal(unset.countryCode, "");
});

test("resuming a sparse imported draft saves it back unchanged", () => {
  const saved: RfqResumeSource = {
    title: "NovaSpark fuel requirement (unconfirmed)",
    materialTypeCode: "other",
    materialTypeName: "Others",
    quantity: null,
    quantityUnit: null,
    targetPricePerUnit: null,
    currencyCode: null,
    countryCode: null,
    stateProvince: null,
    needByDate: null,
    notes: "Workbook note — exact text.",
  };
  const state = initialRfqFormState(saved);
  const result = validateRfqForm(rfqFormInput(state, rfqCategoryOptions(saved)), "draft");
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.value, {
    title: saved.title,
    materialTypeCode: "other",
    quantity: null,
    quantityUnit: null,
    targetPricePerUnit: null,
    currencyCode: null,
    countryCode: null,
    stateProvince: null,
    needByDate: null,
    notes: "Workbook note — exact text.",
  });
});

test("a resumed draft keeps recorded values and an unmapped classification", () => {
  const saved: RfqResumeSource = {
    title: "Zentech feedstock",
    materialTypeCode: "low_co2_feedstock",
    materialTypeName: "Low CO2 feedstock",
    quantity: 20,
    quantityUnit: "tonne",
    targetPricePerUnit: null,
    currencyCode: null,
    countryCode: "US",
    stateProvince: null,
    needByDate: "2026-12-01",
    notes: null,
  };
  const categories = rfqCategoryOptions(saved);
  const state = initialRfqFormState(saved);
  assert.equal(state.category, "Low CO2 feedstock");
  const result = validateRfqForm(rfqFormInput(state, categories), "draft");
  assert.ok(result.ok);
  assert.equal(result.ok && result.value.materialTypeCode, "low_co2_feedstock");
  assert.equal(result.ok && result.value.quantity, 20);
  assert.equal(result.ok && result.value.quantityUnit, "tonne");
  assert.equal(result.ok && result.value.currencyCode, null);
  assert.equal(result.ok && result.value.countryCode, "US");
  assert.equal(result.ok && result.value.needByDate, "2026-12-01");
});
