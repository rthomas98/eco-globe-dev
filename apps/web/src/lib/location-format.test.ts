import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCountryCode, validateFacilityDraft, type FacilityDraft } from "./location-format.ts";

const base: FacilityDraft = {
  name: "Riverside yard",
  addressLine1: "4801 Riverside Dr",
  city: "Baton Rouge",
  stateProvince: "LA",
  postalCode: "70808",
  countryCode: "us",
  latitude: "",
  longitude: "",
};

test("country codes must be two letters; truncated ZIPs are rejected", () => {
  assert.equal(normalizeCountryCode("us"), "US");
  assert.equal(normalizeCountryCode(" MX "), "MX");
  assert.equal(normalizeCountryCode("70"), undefined);
  assert.equal(normalizeCountryCode(""), undefined);
  assert.equal(normalizeCountryCode(null), undefined);
});

test("a ZIP typed into the country box is rejected with guidance", () => {
  const result = validateFacilityDraft({ ...base, countryCode: "70", postalCode: "" });
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.error : "", /two-letter/);
});

test("US ZIP format is checked; other countries accept free-form postal codes", () => {
  assert.equal(validateFacilityDraft({ ...base, postalCode: "70" }).ok, false);
  assert.equal(validateFacilityDraft({ ...base, postalCode: "70808-1234" }).ok, true);
  assert.equal(validateFacilityDraft({ ...base, countryCode: "NL", postalCode: "3011 AA" }).ok, true);
});

test("coordinates are optional but must be a valid pair", () => {
  const none = validateFacilityDraft(base);
  assert.ok(none.ok);
  assert.equal(none.ok && none.value.latitude, undefined);
  assert.equal(validateFacilityDraft({ ...base, latitude: "30.4" }).ok, false);
  assert.equal(validateFacilityDraft({ ...base, latitude: "95", longitude: "-91.1" }).ok, false);
  assert.equal(validateFacilityDraft({ ...base, latitude: "30.4", longitude: "-191" }).ok, false);
  const pair = validateFacilityDraft({ ...base, latitude: "30.45", longitude: "-91.15" });
  assert.ok(pair.ok);
  assert.deepEqual(pair.ok && [pair.value.latitude, pair.value.longitude], [30.45, -91.15]);
  assert.equal(pair.ok && pair.value.countryCode, "US");
});
