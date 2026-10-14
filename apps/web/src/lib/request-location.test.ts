import test from "node:test";
import assert from "node:assert/strict";
import { requestLocation } from "./request-location";
import { GET } from "../app/api/viewer-location/route";

const headers = (lat = "30.45243", lng = "-91.21034") =>
  new Headers({
    "x-vercel-ip-latitude": lat,
    "x-vercel-ip-longitude": lng,
    "x-vercel-ip-city": "Baton%20Rouge",
    "x-vercel-ip-country-region": "LA",
    "x-vercel-ip-country": "US",
    "x-forwarded-for": "192.0.2.10",
  });
test("approximate location trusts only Vercel, rounds coordinates and exposes no IP", () => {
  assert.equal(requestLocation(headers(), "0"), null);
  assert.equal(requestLocation(headers(), ""), null);
  assert.deepEqual(requestLocation(headers(), "1"), {
    lat: 30.45,
    lng: -91.21,
    label: "Baton Rouge, LA, US",
    source: "ip",
  });
  assert.equal(requestLocation(headers("0", "0"), "1")?.lat, 0);
  assert.equal(requestLocation(headers("-90", "180"), "1")?.lng, 180);
});
test("missing, blank, malformed, nonfinite and out-of-range coordinates never invent a fallback", () => {
  assert.equal(requestLocation(new Headers(), "1"), null);
  for (const pair of [
    ["", "0"],
    [" ", "0"],
    ["NaN", "0"],
    ["Infinity", "0"],
    ["91", "0"],
    ["-91", "0"],
    ["0", "181"],
    ["0", "-181"],
    ["1,2", "0"],
  ])
    assert.equal(requestLocation(headers(pair[0], pair[1]), "1"), null);
  const noLabel = headers();
  for (const key of ["city", "country-region", "country"])
    noLabel.delete("x-vercel-ip-" + key);
  assert.equal(requestLocation(noLabel, "1")?.label, "Approximate location");
  noLabel.set("x-vercel-ip-city", "%E0%A4%A");
  assert.equal(requestLocation(noLabel, "1")?.label, "Approximate location");
});
test("same-origin GET always returns 200 with private no-store and nullable location", async (t) => {
  const previous = process.env.VERCEL;
  t.after(() => {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  });
  process.env.VERCEL = "1";
  const response = GET(
    new Request("http://localhost/api/viewer-location", { headers: headers() }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    location: requestLocation(headers(), "1"),
  });
  assert.deepEqual(
    await GET(new Request("http://localhost/api/viewer-location")).json(),
    { location: null },
  );
});
