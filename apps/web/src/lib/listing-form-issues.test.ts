import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ISSUE_FIELD_ELEMENT_IDS,
  emptyListingForm,
  partitionIssues,
  validateForSubmission,
  type ListingForm,
} from "../components/seller/listing-form.ts";

const publishedWithoutSpecs = (): ListingForm => ({
  ...emptyListingForm(),
  name: "Brine sludge",
  category: "Chemical Byproducts",
  materialTypeCode: "industrial_byproduct",
  unit: "tonne",
  currencyCode: "USD",
  price: "99",
  moq: "1",
  qty: "85000",
  locationId: "62",
});

test("admin advisory fields let a published listing without state or frequency save", () => {
  const issues = validateForSubmission(publishedWithoutSpecs(), true);
  assert.deepEqual(issues.map((i) => i.field).sort(), ["frequency", "state"]);
  const { blocking, advisory } = partitionIssues(issues, ["state", "frequency"]);
  assert.deepEqual(blocking, []);
  assert.deepEqual(advisory.map((i) => i.field).sort(), ["frequency", "state"]);
});

test("advisory fields never hide the SDS, price or location requirements", () => {
  const form = { ...publishedWithoutSpecs(), price: "", locationId: "" };
  const { blocking } = partitionIssues(validateForSubmission(form, false), ["state", "frequency"]);
  assert.deepEqual(blocking.map((i) => i.field).sort(), ["locationId", "price", "sds"]);
});

test("without advisory fields (seller policy) state and frequency still block", () => {
  const { blocking } = partitionIssues(validateForSubmission(publishedWithoutSpecs(), true), []);
  assert.deepEqual(blocking.map((i) => i.field).sort(), ["frequency", "state"]);
});

test("every submission issue on an empty form points at a field on the page", () => {
  const issues = validateForSubmission({ ...emptyListingForm(), claims: ["Others"] }, false);
  for (const issue of issues) assert.ok(ISSUE_FIELD_ELEMENT_IDS[issue.field], `no element id for ${issue.field}`);
});
