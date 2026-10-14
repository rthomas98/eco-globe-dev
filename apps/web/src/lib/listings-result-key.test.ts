import { test } from "node:test";
import assert from "node:assert/strict";
import { currentListingsState, listingsResultKey } from "./listings-result-key.ts";

const ready = (key: string) => ({ status: "ready", listings: [{ id: "a" }], records: [{ id: 1 }], error: null, key });

test("result keys separate viewer/company, search and portfolio", () => {
  const base = { viewerKey: "u1:5:buyer", scope: "public" };
  const keys = new Set([
    listingsResultKey(base),
    listingsResultKey({ ...base, viewerKey: "u1:6:buyer" }),
    listingsResultKey({ ...base, portfolioId: 4 }),
    listingsResultKey({ ...base, portfolioId: 5 }),
    listingsResultKey({ ...base, search: "char" }),
    listingsResultKey({ ...base, viewerKey: "guest" }),
  ]);
  assert.equal(keys.size, 6);
});

test("company switch hides the previous company's cards until the new result arrives", () => {
  const oldKey = listingsResultKey({ viewerKey: "u1:5:buyer", scope: "public", portfolioId: 4 });
  const newKey = listingsResultKey({ viewerKey: "u1:6:buyer", scope: "public", portfolioId: 4 });
  assert.deepEqual(currentListingsState(ready(oldKey), newKey), {
    status: "loading",
    listings: [],
    records: [],
    error: null,
  });
});

test("portfolio switch hides the previous portfolio's cards", () => {
  const a = listingsResultKey({ viewerKey: "u1:5:buyer", scope: "public", portfolioId: 4 });
  const b = listingsResultKey({ viewerKey: "u1:5:buyer", scope: "public" });
  assert.equal(currentListingsState(ready(a), b).listings.length, 0);
});

test("the matching result is returned unchanged, without the internal key", () => {
  const key = listingsResultKey({ viewerKey: "guest", scope: "public" });
  const view = currentListingsState(ready(key), key);
  assert.equal(view.status, "ready");
  assert.equal(view.listings.length, 1);
  assert.equal("key" in view, false);
});

test("disabled request (invalid portfolio link) shows no previous cards on the first render", () => {
  // portfolioId is undefined for both "no portfolio" and an invalid link, so
  // the keys match; enabled=false must still empty the view immediately.
  const key = listingsResultKey({ viewerKey: "u1:5:buyer", scope: "public" });
  assert.deepEqual(currentListingsState(ready(key), key, false), {
    status: "ready",
    listings: [],
    records: [],
    error: null,
  });
});

test("current-key server errors are preserved", () => {
  const key = listingsResultKey({ viewerKey: "u1:5:buyer", scope: "public", portfolioId: 4 });
  const failed = { status: "error", listings: [], records: [], error: "Portfolio is unavailable.", key };
  assert.equal(currentListingsState(failed, key).error, "Portfolio is unavailable.");
});
