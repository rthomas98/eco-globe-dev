import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { parseDemoPresentation, parseDemoPresentationPlan } from "./demo-presentation-domain.js";
import { createDemoPresentationHandler } from "./demo-presentation-routes.js";

const presentation = {
  id: randomUUID(), kind: "seller", companyName: "Reviewed example", title: "Biomass example",
  materialTypeCode: "other", quantity: 20, quantityUnitCode: "tonne", price: 100,
  currencyCode: "USD", priceUnitCode: "tonne", priceEstimated: true, quantityEstimated: false,
};

test("public presentation schema is an exact allowlist, including no private fields", () => {
  assert.deepEqual(parseDemoPresentation(presentation), presentation);
  for (const field of ["sourceId", "companyId", "sourceListingId", "email", "location", "notes", "documents", "sdsUrl", "actions", "sourceCitation"]) {
    assert.throws(() => parseDemoPresentation({ ...presentation, [field]: "private" }));
  }
  for (const field of Object.keys(presentation)) {
    const missing: Record<string, unknown> = { ...presentation };
    delete missing[field];
    assert.throws(() => parseDemoPresentation(missing));
  }
});

test("presentation validates IDs, finite nonnegative decimal values, codes, flags and required units", () => {
  for (const patch of [
    { id: "34" }, { kind: "prospect" }, { price: -1 }, { quantity: Infinity }, { price: NaN },
    { price: 1.0001 }, { price: "100" }, { quantityUnitCode: null }, { currencyCode: "usd" },
    { materialTypeCode: "https://private.example" }, { title: "\nprivate" }, { priceEstimated: "true" },
  ]) assert.throws(() => parseDemoPresentation({ ...presentation, ...patch }));
  assert.equal(parseDemoPresentation({ ...presentation, price: null, currencyCode: null, priceUnitCode: null }).price, null);
});

test("enrollment requires explicit matching source, unique UUIDs and sources, no company grants", () => {
  const entry = { sourceListingId: 34, presentation };
  assert.equal(parseDemoPresentationPlan({ approvedByUserId: 1, entries: [entry] }).entries.length, 1);
  const buyer = { ...presentation, id: randomUUID(), kind: "buyer" };
  assert.equal(parseDemoPresentationPlan({ approvedByUserId: 1, entries: [{ sourceWantedListingId: 8, presentation: buyer }] }).entries.length, 1);
  for (const entries of [[], [entry, entry], [{ sourceWantedListingId: 34, presentation }], [{ ...entry, companyId: 9 }], [{ ...entry, sourceListingId: -1 }], [entry, { ...entry, presentation: { ...presentation, id: randomUUID() } }]]) {
    assert.throws(() => parseDemoPresentationPlan({ approvedByUserId: 1, entries }));
  }
  assert.throws(() => parseDemoPresentationPlan({ approvedByUserId: 0, entries: [entry] }));
});

test("signed-out HTTP allows only GET collection, no queries, detail IDs or actions", async t => {
  let reads = 0;
  const handler = createDemoPresentationHandler(async () => { reads++; return [parseDemoPresentation(presentation)]; });
  const server = createServer((req, res) => { void handler(req, res, new URL(req.url!, "http://localhost")); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/demo-presentations`;
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, presentations: [presentation] });
  for (const method of ["POST", "PATCH", "DELETE", "PUT", "HEAD"]) assert.equal((await fetch(base, { method })).status, 405);
  for (const query of ["?sourceId=34", "?scope=owned", "?companyId=9", "?id=34"]) assert.equal((await fetch(base + query)).status, 400);
  assert.equal((await fetch(base + "/34")).status, 404);
  assert.equal(reads, 1);
});

test("public output fails closed if storage accidentally returns a sensitive field", async t => {
  const unsafe = { ...parseDemoPresentation(presentation), notes: "private" };
  const handler = createDemoPresentationHandler(async () => [unsafe]);
  const server = createServer((req, res) => { void handler(req, res, new URL(req.url!, "http://localhost")); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/demo-presentations`);
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private|notes/u);
});
