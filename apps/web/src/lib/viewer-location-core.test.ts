import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIEWER_CACHE_MAX_AGE_MS,
  VIEWER_FOCUS_ZOOM,
  cameraContext,
  effectiveCameraMode,
  isValidCoord,
  parseCachedBrowserLocation,
  parseIpLocationResponse,
  planCamera,
  requestIpLocation,
  resolveViewerLocation,
  serializeBrowserLocation,
  viewerLocationCaption,
  viewerSourceTitle,
  type ViewerLocation,
} from "./viewer-location-core.ts";

const NOW = 1_800_000_000_000;
const browser: ViewerLocation = { lat: 51.5, lng: -0.12, label: "Your current location", source: "browser" };
const ip: ViewerLocation = { lat: 40.71, lng: -74.01, label: "New York, NY, US", source: "ip" };
const saved: ViewerLocation = { lat: 30.45, lng: -91.15, label: "Plant A", source: "saved" };

test("coordinates must be finite and inside geographic ranges", () => {
  assert.equal(isValidCoord(0, 0), true);
  assert.equal(isValidCoord(-90, 180), true);
  assert.equal(isValidCoord(91, 0), false);
  assert.equal(isValidCoord(0, -181), false);
  assert.equal(isValidCoord(Number.NaN, 0), false);
  assert.equal(isValidCoord("30", "-91"), false);
  assert.equal(isValidCoord(undefined, 1), false);
});

test("cache accepts only a recent, in-range browser fix", () => {
  const raw = serializeBrowserLocation(browser, NOW);
  assert.ok(raw);
  assert.deepEqual(parseCachedBrowserLocation(raw, NOW + 1000), { ...browser, accuracy: undefined });
  assert.equal(parseCachedBrowserLocation(raw, NOW + VIEWER_CACHE_MAX_AGE_MS + 1), null);
  assert.equal(parseCachedBrowserLocation(raw, NOW - 1), null, "future timestamps are rejected");
  assert.equal(parseCachedBrowserLocation("{not json", NOW), null);
  assert.equal(parseCachedBrowserLocation("null", NOW), null);
  assert.equal(parseCachedBrowserLocation(JSON.stringify({ lat: 120, lng: 0, savedAt: NOW }), NOW), null);
  assert.equal(
    parseCachedBrowserLocation(JSON.stringify({ ...ip, savedAt: NOW }), NOW),
    null,
    "an IP location in the cache is never trusted as a browser fix",
  );
});

test("IP and saved locations are never written to the persistent cache", () => {
  assert.equal(serializeBrowserLocation(ip, NOW), null);
  assert.equal(serializeBrowserLocation(saved, NOW), null);
});

test("IP response parsing follows the API contract and rejects junk", () => {
  assert.deepEqual(
    parseIpLocationResponse({ location: { lat: 40.71, lng: -74.01, label: "New York, NY, US", source: "ip" } }),
    ip,
  );
  assert.equal(parseIpLocationResponse({ location: null }), null);
  assert.equal(parseIpLocationResponse({ location: { lat: 999, lng: 0, label: "x", source: "ip" } }), null);
  assert.equal(parseIpLocationResponse({ location: { lat: 1, lng: 1, label: "x", source: "browser" } }), null);
  assert.equal(parseIpLocationResponse("oops"), null);
  assert.equal(
    parseIpLocationResponse({ location: { lat: 1, lng: 1, label: "  ", source: "ip" } })?.label,
    "Approximate network location",
  );
});

test("priority is browser, then IP, then saved company location", () => {
  assert.deepEqual(
    resolveViewerLocation({ browser, browserState: "ready", ip, ipState: "done", saved }),
    { location: browser, status: "ready" },
  );
  assert.deepEqual(
    resolveViewerLocation({ browser: null, browserState: "denied", ip, ipState: "done", saved }),
    { location: ip, status: "fallback" },
  );
  assert.deepEqual(
    resolveViewerLocation({ browser: null, browserState: "unavailable", ip: null, ipState: "done", saved }),
    { location: saved, status: "fallback" },
  );
});

test("late IP result never overrides an earlier browser fix", () => {
  const before = resolveViewerLocation({ browser, browserState: "ready", ip: null, ipState: "pending", saved: null });
  const after = resolveViewerLocation({ browser, browserState: "ready", ip, ipState: "done", saved: null });
  assert.equal(before.location, browser);
  assert.equal(after.location, browser);
});

test("no location reports checking, denied or unavailable without inventing a city", () => {
  assert.deepEqual(
    resolveViewerLocation({ browser: null, browserState: "pending", ip: null, ipState: "pending", saved: null }),
    { location: null, status: "checking" },
  );
  assert.deepEqual(
    resolveViewerLocation({ browser: null, browserState: "denied", ip: null, ipState: "done", saved: null }),
    { location: null, status: "denied" },
  );
  assert.deepEqual(
    resolveViewerLocation({ browser: null, browserState: "unavailable", ip: null, ipState: "done", saved: null }),
    { location: null, status: "unavailable" },
  );
});

test("popup titles are source-specific; only a browser fix reads as the viewer's position", () => {
  assert.equal(viewerSourceTitle("browser"), "Your browser location");
  assert.equal(viewerSourceTitle("ip"), "Approximate network location");
  assert.equal(viewerSourceTitle("saved"), "Saved company location");
  for (const source of ["browser", "ip", "saved"] as const)
    assert.doesNotMatch(viewerSourceTitle(source), /You are here/);
});

test("each source has a distinct caption", () => {
  const captions = [browser, ip, saved].map((location) => viewerLocationCaption(location, "ready"));
  assert.equal(new Set(captions).size, 3);
  assert.match(captions[1]!, /approximate network location: New York/);
  assert.match(captions[2]!, /saved company location: Plant A/);
  assert.match(viewerLocationCaption(null, "checking"), /Finding/);
});

const listings = [
  { lng: -0.12, lat: 51.5 },
  { lng: -95.37, lat: 29.76 },
  { lng: -46.63, lat: -23.55 },
];
const base = {
  points: listings,
  radiusFitListings: false,
  selectionRadius: true,
  focusViewer: true,
  mode: "auto" as const,
};

test("browse map opens around the viewer instead of fitting a worldwide catalogue", () => {
  const plan = planCamera({ ...base, viewer: ip, origin: ip });
  assert.deepEqual(plan, { kind: "center", center: ip, zoom: VIEWER_FOCUS_ZOOM });
});

test("async listing load does not change the viewer-centred camera", () => {
  const empty = planCamera({ ...base, points: [], viewer: ip, origin: ip });
  const loaded = planCamera({ ...base, viewer: ip, origin: ip });
  assert.deepEqual(empty, loaded);
});

test("without any viewer location the browse map fits listings", () => {
  assert.deepEqual(planCamera({ ...base, viewer: null }), { kind: "fit", points: listings });
});

test("explicit selection and radius keep their prior camera behaviour", () => {
  const selected = planCamera({ ...base, viewer: ip, origin: ip, selectedId: "a", selectedPoint: listings[1] });
  assert.deepEqual(selected, { kind: "fit", points: [listings[1], ip] });
  const radius = planCamera({ ...base, viewer: ip, origin: ip, radiusMiles: 50 });
  assert.deepEqual(radius, { kind: "fit", points: [ip], radius: { origin: ip, miles: 50 } });
  assert.deepEqual(
    planCamera({ ...base, selectionRadius: false, selectedId: "a", viewer: ip }),
    { kind: "none" },
    "non-radius selection is handled by the fly-to effect",
  );
});

test("manual pan wins over an active radius and selection when async data changes", () => {
  const busy = { ...base, origin: ip, radiusMiles: 50, selectedId: "a", selectedPoint: listings[1], mode: "manual" as const };
  assert.deepEqual(planCamera({ ...busy, viewer: ip }), { kind: "none" });
  assert.deepEqual(planCamera({ ...busy, viewer: browser, points: [] }), { kind: "none" }, "late viewer/listings do not refit");
  assert.deepEqual(planCamera({ ...busy, radiusFitListings: true }), { kind: "none" });
  assert.deepEqual(
    planCamera({ ...busy, mode: "auto" }),
    { kind: "fit", points: [ip], radius: { origin: ip, miles: 50 } },
    "same inputs without the manual pan keep the automatic radius fit",
  );
});

test("manual camera moves are not overridden by async updates", () => {
  assert.deepEqual(planCamera({ ...base, viewer: browser, origin: browser, mode: "manual" }), { kind: "none" });
});

test("Recenter and Show all are explicit modes", () => {
  const search = { lng: 4.48, lat: 51.92 };
  assert.deepEqual(
    planCamera({ ...base, viewer: browser, origin: search, mode: "viewer" }),
    { kind: "center", center: browser, zoom: VIEWER_FOCUS_ZOOM },
  );
  assert.deepEqual(
    planCamera({ ...base, viewer: browser, mode: "all" }),
    { kind: "fit", points: [...listings, browser] },
  );
});

test("Recenter and Show all still work with a selected listing and an active radius", () => {
  const busy = { ...base, viewer: ip, origin: ip, radiusMiles: 50, selectedId: "a", selectedPoint: listings[1] };
  assert.deepEqual(planCamera({ ...busy, mode: "viewer" }), { kind: "center", center: ip, zoom: VIEWER_FOCUS_ZOOM });
  assert.deepEqual(planCamera({ ...busy, mode: "all" }), { kind: "fit", points: [...listings, ip] });
  assert.deepEqual(
    planCamera({ ...base, selectionRadius: false, selectedId: "a", viewer: ip, mode: "viewer" }),
    { kind: "center", center: ip, zoom: VIEWER_FOCUS_ZOOM },
  );
});

test("an explicit camera choice expires when the selection or radius changes", () => {
  const chosenWith = cameraContext("a", 50);
  const state = { mode: "all" as const, context: chosenWith, nonce: 1 };
  assert.equal(effectiveCameraMode(state, chosenWith), "all");
  assert.equal(effectiveCameraMode(state, cameraContext("b", 50)), "auto");
  assert.equal(effectiveCameraMode(state, cameraContext("a", 0)), "auto");
  assert.equal(effectiveCameraMode(state, cameraContext(null, 50)), "auto");
  assert.equal(effectiveCameraMode({ mode: "manual", context: chosenWith, nonce: 1 }, chosenWith), "manual");
  assert.equal(
    effectiveCameraMode({ mode: "manual", context: chosenWith, nonce: 1 }, cameraContext("b", 50)),
    "auto",
    "a new selection or radius applies after a manual pan",
  );
  assert.equal(cameraContext(undefined, undefined), cameraContext(null, 0));
});

function fakeFetch(handler: (init: RequestInit) => Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return handler(init);
  }) as typeof fetch;
  return { impl, calls };
}

test("IP lookup calls the same-origin route without caching", async () => {
  const { impl, calls } = fakeFetch(async () =>
    new Response(JSON.stringify({ location: { lat: 40.71, lng: -74.01, label: "New York, NY, US", source: "ip" } })),
  );
  assert.deepEqual(await requestIpLocation(impl, new AbortController().signal, 1000), ip);
  assert.equal(calls[0]!.url, "/api/viewer-location");
  assert.equal(calls[0]!.init.cache, "no-store");
});

test("IP lookup that never answers resolves null at the deadline instead of staying checking", async () => {
  let aborted = false;
  const { impl } = fakeFetch((init) => {
    init.signal?.addEventListener("abort", () => (aborted = true));
    return new Promise<Response>(() => {});
  });
  const started = Date.now();
  assert.equal(await requestIpLocation(impl, new AbortController().signal, 50), null);
  assert.ok(Date.now() - started < 1000);
  assert.equal(aborted, true, "the hung request is aborted");
});

test("IP lookup returns null for errors, refusals, bad JSON and caller aborts", async () => {
  const signal = () => new AbortController().signal;
  assert.equal(await requestIpLocation(fakeFetch(async () => { throw new TypeError("offline"); }).impl, signal(), 500), null);
  assert.equal(await requestIpLocation(fakeFetch(async () => new Response("{}", { status: 503 })).impl, signal(), 500), null);
  assert.equal(await requestIpLocation(fakeFetch(async () => new Response("not json")).impl, signal(), 500), null);
  assert.equal(await requestIpLocation(fakeFetch(async () => new Response(JSON.stringify({ location: null }))).impl, signal(), 500), null);
  const controller = new AbortController();
  const pending = requestIpLocation(
    fakeFetch((init) => new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))))).impl,
    controller.signal,
    5000,
  );
  controller.abort();
  assert.equal(await pending, null, "unmount/stale abort resolves without a late result");
  const already = new AbortController();
  already.abort();
  const { impl, calls } = fakeFetch(async () => new Response("{}"));
  assert.equal(await requestIpLocation(impl, already.signal, 500), null);
  assert.equal(calls.length, 0);
});

test("detail maps without viewer focus stay on their listing, not the viewer", () => {
  const plan = planCamera({ ...base, points: [listings[1]!], focusViewer: false, viewer: browser });
  assert.deepEqual(plan, { kind: "fit", points: [listings[1]] });
});
