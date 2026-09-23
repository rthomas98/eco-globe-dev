import assert from "node:assert/strict";
import test from "node:test";
import { resolveCityLocation } from "./city-location";

test("Baton Rouge resolves with a state abbreviation or full name", () => {
  for (const region of ["LA", "Louisiana"]) {
    const point = resolveCityLocation({
      city: "Baton Rouge",
      region,
      country: "US",
    });
    assert.ok(
      point &&
        point.lat > 30 &&
        point.lat < 31 &&
        point.lng < -91 &&
        point.lng > -92,
    );
  }
});

test("legacy invalid country requires a unique city and region match", () => {
  assert.equal(
    resolveCityLocation({ city: "Baton Rouge", region: "LA", country: "70" })
      ?.label,
    "Baton Rouge, LA, US",
  );
  assert.equal(
    resolveCityLocation({ city: "Baton Rouge", region: "", country: "70" }),
    null,
  );
});

test("unknown, ambiguous, or contradictory locations do not produce pins", () => {
  assert.equal(
    resolveCityLocation({ city: "Springfield", region: "", country: "US" }),
    null,
  );
  assert.equal(
    resolveCityLocation({ city: "Baton Rouge", region: "LA", country: "CA" }),
    null,
  );
  assert.equal(
    resolveCityLocation({
      city: "Not a real city",
      region: "LA",
      country: "US",
    }),
    null,
  );
});
