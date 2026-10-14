// Pure viewer-location helpers shared by the hook and the browse maps.
// Kept free of React/DOM imports so node:test can exercise them directly.

export type ViewerLocationSource = "browser" | "ip" | "saved";
export type ViewerLocationStatus =
  | "checking"
  | "ready"
  | "fallback"
  | "denied"
  | "unavailable";

export interface ViewerLocation {
  lat: number;
  lng: number;
  label: string;
  source: ViewerLocationSource;
  accuracy?: number;
}

export const VIEWER_CACHE_KEY = "ecoglobe.viewerLocation";
export const VIEWER_CACHE_MAX_AGE_MS = 1000 * 60 * 10;

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 120);
  return trimmed || fallback;
}

/**
 * Parse the cached browser location. The cache is untrusted input: anything
 * that is not a recent, in-range browser fix is ignored. Only browser fixes are
 * ever cached, so a non-browser source is rejected too.
 */
export function parseCachedBrowserLocation(
  raw: string | null,
  now: number,
): ViewerLocation | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const value = parsed as Record<string, unknown>;
  if (value.source !== undefined && value.source !== "browser") return null;
  const savedAt = value.savedAt;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
  if (savedAt > now || now - savedAt > VIEWER_CACHE_MAX_AGE_MS) return null;
  if (!isValidCoord(value.lat, value.lng)) return null;
  const accuracy =
    typeof value.accuracy === "number" &&
    Number.isFinite(value.accuracy) &&
    value.accuracy >= 0
      ? value.accuracy
      : undefined;
  return {
    lat: value.lat as number,
    lng: value.lng as number,
    label: "Your current location",
    source: "browser",
    accuracy,
  };
}

export function serializeBrowserLocation(
  location: ViewerLocation,
  now: number,
): string | null {
  if (location.source !== "browser") return null;
  return JSON.stringify({
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy,
    source: "browser",
    savedAt: now,
  });
}

/** Parse GET /api/viewer-location. Anything malformed means "no IP location". */
export function parseIpLocationResponse(body: unknown): ViewerLocation | null {
  if (!body || typeof body !== "object") return null;
  const location = (body as { location?: unknown }).location;
  if (!location || typeof location !== "object") return null;
  const value = location as Record<string, unknown>;
  if (value.source !== "ip") return null;
  if (!isValidCoord(value.lat, value.lng)) return null;
  return {
    lat: value.lat as number,
    lng: value.lng as number,
    label: cleanLabel(value.label, "Approximate network location"),
    source: "ip",
  };
}

/**
 * Same-origin approximate IP lookup with a hard deadline. Never rejects:
 * failure, refusal, malformed data, the deadline or a caller abort all mean
 * "no IP location", so the viewer state can never stay "checking".
 */
export async function requestIpLocation(
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<ViewerLocation | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) return null;
  signal.addEventListener("abort", abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const lookup = (async () => {
    try {
      const response = await fetchImpl("/api/viewer-location", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return parseIpLocationResponse(await response.json());
    } catch {
      return null;
    }
  })();
  try {
    return await Promise.race([lookup, deadline]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export interface ViewerLocationCandidates {
  browser: ViewerLocation | null;
  browserState: "pending" | "ready" | "denied" | "unavailable";
  ip: ViewerLocation | null;
  ipState: "idle" | "pending" | "done";
  saved: ViewerLocation | null;
}

/**
 * Browser fix beats the approximate IP location, which beats a saved company
 * facility. A late lower-priority result can never replace a better one.
 */
export function resolveViewerLocation(c: ViewerLocationCandidates): {
  location: ViewerLocation | null;
  status: ViewerLocationStatus;
} {
  if (c.browser) return { location: c.browser, status: "ready" };
  const fallback = c.ip ?? c.saved;
  if (fallback) return { location: fallback, status: "fallback" };
  if (c.browserState === "pending" || c.ipState === "pending")
    return { location: null, status: "checking" };
  return {
    location: null,
    status: c.browserState === "denied" ? "denied" : "unavailable",
  };
}

/** Popup title: only a browser fix may claim to be where the viewer is. */
export function viewerSourceTitle(source: ViewerLocationSource): string {
  switch (source) {
    case "browser":
      return "Your browser location";
    case "ip":
      return "Approximate network location";
    case "saved":
      return "Saved company location";
  }
}

export function viewerSourceDescription(source: ViewerLocationSource): string {
  switch (source) {
    case "browser":
      return "From your browser location";
    case "ip":
      return "Approximate, from your network (may differ on VPN or mobile networks)";
    case "saved":
      return "Saved company location";
  }
}

export function viewerLocationCaption(
  location: ViewerLocation | null | undefined,
  status: ViewerLocationStatus = "unavailable",
): string {
  if (!location) {
    if (status === "checking") return "Finding your location…";
    if (status === "denied")
      return "Location permission is off — showing all listings";
    return "Enable location to show where you are browsing from";
  }
  switch (location.source) {
    case "browser":
      return "Showing your current browser location";
    case "ip":
      return `Showing approximate network location: ${location.label}`;
    case "saved":
      return `Showing saved company location: ${location.label}`;
  }
}

export interface LngLat {
  lng: number;
  lat: number;
}

export type CameraPlan =
  | { kind: "none" }
  | { kind: "center"; center: LngLat; zoom: number }
  | { kind: "fit"; points: LngLat[]; radius?: { origin: LngLat; miles: number } };

export const VIEWER_FOCUS_ZOOM = 7;

/**
 * auto: follow the viewer/search origin; viewer: explicit "Recenter on my
 * location"; all: explicit "Show all listings"; manual: the visitor moved the
 * map, so asynchronous updates must not move it again.
 */
export type CameraMode = "auto" | "viewer" | "all" | "manual";

export interface CameraState {
  mode: CameraMode;
  /** Selection/radius context the mode was chosen in. */
  context: string;
  /** Bumped on every explicit click so repeating it re-applies the camera. */
  nonce: number;
}

export function cameraContext(selectedId: string | null | undefined, radiusMiles: number | undefined) {
  return `${selectedId ?? ""}|${radiusMiles && radiusMiles > 0 ? radiusMiles : 0}`;
}

/**
 * Recenter, Show all and a manual pan apply to the selection and radius they
 * were made with; picking another listing or radius hands the camera back to
 * that new choice.
 */
export function effectiveCameraMode(state: CameraState, context: string): CameraMode {
  if (state.mode === "auto") return "auto";
  return state.context === context ? state.mode : "auto";
}

/**
 * Decide where the map camera should go. Explicit selection/radius keep their
 * prior behaviour; otherwise a browse map focuses the viewer (or the explicit
 * search origin) and does not refit worldwide when listings arrive later.
 */
export function planCamera(input: {
  points: LngLat[];
  origin?: LngLat;
  radiusMiles?: number;
  radiusFitListings: boolean;
  selectedId?: string | null;
  selectionRadius: boolean;
  selectedPoint?: LngLat;
  viewer?: LngLat | null;
  focusViewer: boolean;
  mode: CameraMode;
}): CameraPlan {
  // Explicit Recenter / Show all win over the current selection or radius;
  // `effectiveCameraMode` expires them once the selection or radius changes.
  if (input.mode === "viewer" && input.viewer)
    return { kind: "center", center: input.viewer, zoom: VIEWER_FOCUS_ZOOM };
  if (input.mode === "all") {
    const points = [...input.points];
    if (input.viewer && input.focusViewer) points.push(input.viewer);
    if (points.length) return { kind: "fit", points };
  }
  // A manual pan/zoom is never undone by async viewer/origin/listing updates,
  // even with a radius or selection active; it expires on a new selection or
  // radius (see effectiveCameraMode) or an explicit control.
  if (input.mode === "manual") return { kind: "none" };
  if (input.selectedId && !input.selectionRadius) return { kind: "none" };
  const hasRadius = !!input.origin && !!input.radiusMiles && input.radiusMiles > 0;
  if (hasRadius) {
    return {
      kind: "fit",
      points: [
        ...(input.radiusFitListings
          ? input.selectedPoint
            ? [input.selectedPoint]
            : input.points
          : []),
        input.origin!,
      ],
      radius: { origin: input.origin!, miles: input.radiusMiles! },
    };
  }
  if (input.selectedPoint) {
    return {
      kind: "fit",
      points: [input.selectedPoint, ...(input.origin ? [input.origin] : [])],
    };
  }
  if (input.focusViewer) {
    const focus = input.origin ?? input.viewer;
    if (focus) return { kind: "center", center: focus, zoom: VIEWER_FOCUS_ZOOM };
    return input.points.length
      ? { kind: "fit", points: input.points }
      : { kind: "none" };
  }
  const points = [...input.points, ...(input.origin ? [input.origin] : [])];
  return points.length ? { kind: "fit", points } : { kind: "none" };
}
