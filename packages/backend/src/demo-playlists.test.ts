import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { parseDemoGeography, parseDemoPlaylist, parseDemoPlaylistPlan, canonical, digest } from "./demo-playlist-domain.js";
import { playlistFixture } from "./demo-playlist-fixture.js";
import { createDemoPlaylistHandler } from "./demo-playlist-routes.js";

test("exact approved DTO preserves zero, annual units, gate fees, ranges and independent qualifications", () => {
  const input = playlistFixture();
  assert.deepEqual(parseDemoPlaylist(input), input);
  const material = input.materials[0]!;
  material.price = { kind: "value", amount: { kind: "range", min: -60, max: -50 }, currencyCode: "EUR", perUnit: "tonne", direction: "seller_pays_gate_fee", basis: "source_estimate" };
  material.volume = { kind: "value", amount: { kind: "text", text: "Source midpoint: 5 million gallons annually" }, unit: "gallon", period: "annual", basis: "source_estimate" };
  material.sourceStatus = "unconfirmed"; material.qualifier = "Potential demand only"; material.equivalents = ["Possible substitute, requires review"];
  assert.deepEqual(parseDemoPlaylist(input), input);
  assert.equal(input.companies.length, 11);
  assert.equal(input.companies.filter(c => c.materialState === "no_material_data").length, 10);
  input.relationships[0]!.kind = "similar_generator";
  assert.equal(parseDemoPlaylist(input).relationships[0]!.kind, "similar_generator");
  assert.throws(() => parseDemoPlaylist({ ...input, relationships: [{ ...input.relationships[0], kind: "confirmed_supplier" }] }));
  material.price.direction = "buyer_pays";
  assert.throws(() => parseDemoPlaylist(input));
});
test("geography requires reviewed coordinates, valid country, postal text and pending variants", () => {
  const postal = { kind: "point", latitude: 42, longitude: -71, precision: "postal_area", purpose: "unknown", label: "Approximate postal area", countryCode: "US", postalCode: "00501" };
  assert.deepEqual(parseDemoGeography(postal), postal);
  for (const change of [{ countryCode: null }, { latitude: 91 }, { latitude: 0, longitude: 0 }, { postalCode: null }, { precision: "city" }, { countryCode: "USA" }, { longitude: NaN }]) assert.throws(() => parseDemoGeography({ ...postal, ...change }));
  for (const reason of ["missing_location", "missing_country", "conflicting_address", "unreviewed", "unresolved"]) assert.deepEqual(parseDemoGeography({ kind: "pending", reason }), { kind: "pending", reason });
  assert.throws(() => parseDemoGeography({ kind: "pending", reason: "conflicting_address", latitude: 30 }));
});
test("public fields reject private additions, contact/doc content, dangling IDs, invalid counts and negative volume", () => {
  const fixture = playlistFixture();
  for (const key of ["sourceId", "sourceCitation", "documents", "contacts", "privateNotes", "editUrl"]) assert.throws(() => parseDemoPlaylist({ ...fixture, [key]: "private" }));
  for (const title of ["Contact person@example.invalid", "https://private.invalid/research.pdf", "www.private.invalid"]) assert.throws(() => parseDemoPlaylist({ ...fixture, materials: [{ ...fixture.materials[0], title }] }));
  assert.throws(() => parseDemoPlaylist({ ...fixture, materials: [{ ...fixture.materials[0], companyId: randomUUID() }] }));
  assert.throws(() => parseDemoPlaylist({ ...fixture, materials: [{ ...fixture.materials[0], volume: { kind: "value", amount: { kind: "scalar", value: -1 }, unit: "gallon", period: "annual", basis: "source" } }] }));
  assert.throws(() => parseDemoPlaylist({ ...fixture, counts: { ...fixture.counts, mapped: 1 } }));
  assert.throws(() => parseDemoPlaylist({ ...fixture, relationships: [{ ...fixture.relationships[0], fromCompanyId: randomUUID() }] }));
});
test("reviewed intake binds every source and private provenance without exposing it", () => {
  const detail = playlistFixture();
  const plan = { approvedByUserId: 1, intakeId: "synthetic-reviewed-intake", sourceHashes: ["a".repeat(64)], detail, sources: [{ entryId: detail.materials[0]!.id, kind: "listing", id: 1, provenance: { sheet: "Sellers", row: 2, privateCitation: "https://private.invalid" } }], profileProvenance: { reviewed: true }, relationshipProvenance: { reviewed: true }, reason: "Synthetic approval" };
  assert.deepEqual(parseDemoPlaylistPlan(plan), plan);
  assert.throws(() => parseDemoPlaylistPlan({ ...plan, sources: [] }));
  assert.throws(() => parseDemoPlaylistPlan({ ...plan, sources: [plan.sources[0], plan.sources[0]] }));
  assert.throws(() => parseDemoPlaylistPlan({ ...plan, sources: [{ ...plan.sources[0], kind: "wanted" }] }));
  assert.equal(digest({ a: 1, b: { c: 2 } }), digest({ b: { c: 2 }, a: 1 }));
  assert.notEqual(digest(plan), digest({ ...plan, reason: "Different review" }));
  assert.equal(canonical(parseDemoPlaylist(detail)).includes("private.invalid"), false);
});
test("real HTTP routes enforce public read-only contract for anonymous and other-company callers", async () => {
  const fixture = playlistFixture();
  const handler = createDemoPlaylistHandler(async () => [{ slug: "all", name: "ALL" }, fixture.playlist], async s => s === "fuel-lsu" ? fixture : null);
  const server = createServer((req, res) => { void handler(req,res,new URL(req.url ?? "/", "http://localhost")).then(handled => { if (!handled) { res.writeHead(404); res.end(); } }); });
  server.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert(address && typeof address !== "string"); const base = `http://127.0.0.1:${address.port}`;
  try {
    const anonymous = await fetch(`${base}/api/demo-playlists/fuel-lsu`);
    assert.equal(anonymous.headers.get("cache-control"), "no-store");
    assert.deepEqual(await anonymous.json(), fixture);
    assert.deepEqual(await (await fetch(`${base}/api/demo-playlists/fuel-lsu`, { headers: { authorization: "Bearer other-company", cookie: "company=999" } })).json(), fixture);
    assert.deepEqual(await (await fetch(`${base}/api/demo-playlists`)).json(), { ok: true, playlists: [fixture.playlist, { slug: "all", name: "ALL" }] });
    for (const [path,status] of [["/all",404], ["/fuel-lsu/source",404], ["/fuel-lsu/",404], ["/fuel-lsu?sourceId=1",400], ["?companyId=999",400], ["/unknown",404]]) assert.equal((await fetch(`${base}/api/demo-playlists${path}`)).status, status);
    for (const method of ["POST", "PUT", "DELETE", "PATCH", "HEAD"]) assert.equal((await fetch(`${base}/api/demo-playlists/fuel-lsu`, { method })).status, 405);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }
});
test("HTTP output boundary rejects private nested fields, wrong playlist and store errors without leaks", async () => {
  const marker = "private-provenance-sentinel";
  let output: unknown;
  const handler = createDemoPlaylistHandler(async () => [], async () => {
    if (output instanceof Error) throw output;
    return output as ReturnType<typeof playlistFixture>;
  });
  const server = createServer((req,res) => { void handler(req,res,new URL(req.url ?? "/", "http://localhost")); });
  server.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening",resolve));
  const address = server.address(); assert(address && typeof address !== "string");
  try {
    const fixture = playlistFixture();
    const contaminated = [
      { ...fixture, sourceIds: [marker] },
      { ...fixture, materials: [{ ...fixture.materials[0], provenance: marker }] },
      { ...fixture, companies: fixture.companies.map((company, i) => i === 0 ? { ...company, privateNotes: marker } : company) },
      { ...fixture, relationships: fixture.relationships.map(relationship => ({ ...relationship, sourceCitation: marker })) },
      { ...fixture, playlist: { slug: "all", name: "Wrong playlist" } },
      new Error(marker),
    ];
    const url = `http://127.0.0.1:${address.port}/api/demo-playlists/fuel-lsu`;
    for (const value of contaminated) {
      output = value;
      const response = await fetch(url);
      assert.equal(response.status, 500);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { ok: false, error: "Demo playlists are unavailable." });
    }
    output = fixture;
    assert.deepEqual(await (await fetch(url)).json(), fixture);
  }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
