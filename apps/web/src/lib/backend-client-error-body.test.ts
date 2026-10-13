// backend-client uses parameter properties and extensionless imports, so run
// with a TypeScript loader, e.g. node --import <tsx>/dist/loader.mjs --test <this file>.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BackendApiError, apiFetch } from "./backend-client";

// apiFetch schedules its deadline on `window`; node has the same timers globally.
(globalThis as { window?: unknown }).window ??= globalThis;

function mockFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

test("existing three-argument errors keep their status classification", () => {
  assert.equal(new BackendApiError("x", 409).kind, "conflict");
  assert.equal(new BackendApiError("x", 400).kind, "validation");
  assert.equal(new BackendApiError("x", 503).kind, "network");
  assert.equal(new BackendApiError("x", undefined, "timeout").kind, "timeout");
  assert.equal(new BackendApiError("x", 400).body, undefined);
});

test("structured error codes and field errors survive on the thrown error", async () => {
  const errorBody = {
    ok: false,
    error: "Fix the highlighted fields.",
    code: "validation_failed",
    fieldErrors: { "price.value": "Use at most 2 decimal places." },
  };
  mockFetch(400, errorBody);
  await assert.rejects(apiFetch("/api/admin/market-records", { method: "POST", body: "{}" }), (error: unknown) => {
    assert.ok(error instanceof BackendApiError);
    assert.equal(error.kind, "validation");
    assert.equal(error.status, 400);
    assert.equal(error.message, "Fix the highlighted fields.");
    assert.deepEqual(error.body, errorBody);
    return true;
  });
});

test("409 conflicts keep their classification and existing-record details", async () => {
  mockFetch(409, { ok: false, error: "Duplicate.", code: "duplicate_identity", existingId: 7 });
  await assert.rejects(apiFetch("/api/admin/market-records"), (error: unknown) => {
    assert.ok(error instanceof BackendApiError);
    assert.equal(error.kind, "conflict");
    assert.deepEqual(error.body, { ok: false, error: "Duplicate.", code: "duplicate_identity", existingId: 7 });
    return true;
  });
});

test("non-JSON error bodies fall back to the status message", async () => {
  mockFetch(503, "<html>bad gateway</html>");
  await assert.rejects(apiFetch("/api/x"), (error: unknown) => {
    assert.ok(error instanceof BackendApiError);
    assert.equal(error.kind, "network");
    assert.equal(error.body, undefined);
    assert.equal(error.message, "The EcoGlobe backend is unavailable right now.");
    return true;
  });
});

test("requests still go through the same-origin proxy with cookies", async () => {
  const calls = mockFetch(200, { ok: true });
  await apiFetch("/api/admin/market-records");
  assert.equal(calls[0].url, "/api/backend/api/admin/market-records");
  assert.equal(calls[0].init.credentials, "same-origin");
});
