// The clients import backend-client (parameter properties, extensionless
// imports), so run with a TypeScript loader:
// node --import <tsx>/dist/loader.mjs --test <this file>.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BackendApiError } from "./backend-client";
import {
  archiveMarketPortfolio,
  fetchAssignedPortfolios,
  fetchMarketPortfolio,
  fetchMarketPortfolios,
  updateMarketPortfolio,
} from "./api-market-portfolios";
import { fetchListings } from "./listings-api";

(globalThis as { window?: unknown }).window ??= globalThis;

function mockFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

const sqlPortfolio = {
  id: 4,
  version: "00000000000007d1",
  name: "Demo",
  description: null,
  status: "active",
  recordIds: null,
  listingIds: [11],
  companyIds: null,
  createdAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
};

test("admin list uses the bounded admin route with status and search", async () => {
  const calls = mockFetch(200, { ok: true, portfolios: [sqlPortfolio] });
  const portfolios = await fetchMarketPortfolios({ status: "all", search: "gulf coast" });
  assert.match(calls[0]!.url, /\/api\/admin\/market-portfolios\?status=all&search=gulf\+coast$/);
  assert.deepEqual(portfolios[0]!.recordIds, [], "null membership from SQL becomes []");
  assert.deepEqual(portfolios[0]!.companyIds, []);
});

test("detail, update and archive send expectedVersion and reason only", async () => {
  let calls = mockFetch(200, { ok: true, portfolio: sqlPortfolio });
  await fetchMarketPortfolio(4);
  assert.match(calls[0]!.url, /\/api\/admin\/market-portfolios\/4$/);

  calls = mockFetch(200, { ok: true, portfolio: sqlPortfolio });
  await updateMarketPortfolio(4, "00000000000007d1", {
    name: "Demo",
    description: null,
    recordIds: [],
    listingIds: [11],
    companyIds: [2],
    reason: "Add company",
  });
  assert.equal(calls[0]!.init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
    expectedVersion: "00000000000007d1",
    name: "Demo",
    description: null,
    recordIds: [],
    listingIds: [11],
    companyIds: [2],
    reason: "Add company",
  });

  calls = mockFetch(200, { ok: true, portfolio: { ...sqlPortfolio, status: "archived" } });
  await archiveMarketPortfolio(4, "00000000000007d1", "Demo over");
  assert.match(calls[0]!.url, /\/api\/admin\/market-portfolios\/4\/archive$/);
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
    expectedVersion: "00000000000007d1",
    reason: "Demo over",
  });
});

test("stale version conflicts surface as 409 errors for the form to explain", async () => {
  mockFetch(409, { ok: false, error: "Portfolio changed." });
  await assert.rejects(archiveMarketPortfolio(4, "0000000000000000", "x"), (error: unknown) => {
    assert.ok(error instanceof BackendApiError);
    assert.equal(error.status, 409);
    return true;
  });
});

test("buyer assignments use the member route, never the admin route", async () => {
  const calls = mockFetch(200, {
    ok: true,
    portfolios: [{ id: 4, name: "Demo" }, { id: 0, name: "bad" }, { id: 5 }],
  });
  const assigned = await fetchAssignedPortfolios();
  assert.match(calls[0]!.url, /\/api\/market-portfolios\/assigned$/);
  assert.doesNotMatch(calls[0]!.url, /admin/);
  assert.deepEqual(assigned, [{ id: 4, name: "Demo" }]);
});

test("catalogue without a portfolio is unchanged; with one it is scoped", async () => {
  let calls = mockFetch(200, { ok: true, listings: [] });
  await fetchListings("public");
  assert.match(calls[0]!.url, /\/api\/listings$/);

  calls = mockFetch(200, { ok: true, listings: [] });
  await fetchListings("public", { portfolioId: 4 });
  assert.match(calls[0]!.url, /\/api\/listings\?scope=public&portfolioId=4$/);

  calls = mockFetch(200, { ok: true, listings: [] });
  await fetchListings("owned", { portfolioId: 4 });
  assert.doesNotMatch(calls[0]!.url, /portfolioId/, "owned scope never carries a demo group");
});

test("a refused portfolio is an error, not a fallback to the full catalogue", async () => {
  for (const status of [400, 401, 403]) {
    const calls = mockFetch(status, { ok: false, error: "Not available." });
    await assert.rejects(fetchListings("public", { portfolioId: 4 }), (error: unknown) => {
      assert.ok(error instanceof BackendApiError);
      assert.equal(error.status, status);
      return true;
    });
    assert.equal(calls.length, 1, "no second unfiltered request");
  }
});
