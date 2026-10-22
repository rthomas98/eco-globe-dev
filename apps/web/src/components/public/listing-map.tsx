"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { materialImage, isMaterialIllustration } from "@/lib/material-images";
import type { Listing } from "./browse-listings";
import { useCityLocation } from "@/lib/use-city-location";
import { STREET_STYLE } from "@/lib/street-map-style";
import {
  type ViewerLocation,
  type ViewerLocationState,
  useViewerLocation,
} from "@/lib/viewer-location";
import {
  planCamera,
  viewerLocationCaption,
  viewerSourceDescription,
  viewerSourceTitle,
  cameraContext,
  effectiveCameraMode,
  type CameraPlan,
  type CameraState,
} from "@/lib/viewer-location-core";

export interface MapListing {
  id: string;
  title: string;
  location: string;
  price: string;
  unit: string;
  moq: string;
  co2: string;
  lng: number;
  lat: number;
  image?: string;
  approximate?: boolean;
}

/**
 * A presentation-only demo material example. Kept apart from MapListing so a
 * demo key can never reach a marketplace detail route: its popup's only
 * action is `onViewDemo`.
 */
export interface DemoMapPin {
  /** Namespaced demo result key, e.g. "demo:fuel-lsu:<id>". */
  key: string;
  title: string;
  company: string;
  role: "seller" | "buyer";
  lng: number;
  lat: number;
  facts: Array<{ label: string; value: string }>;
  distance?: string;
}

const EMPTY_LISTINGS: MapListing[] = [];
const EMPTY_DEMO_PINS: DemoMapPin[] = [];

const DEMO_PIN_COLORS: Record<DemoMapPin["role"], { fill: string; selected: string }> = {
  seller: { fill: "#D97706", selected: "#92400E" },
  buyer: { fill: "#7C3AED", selected: "#4C1D95" },
};

function buildDemoPopupContent(pin: DemoMapPin, onView: (key: string) => void): HTMLDivElement {
  // Bounded so the popup fits a 390px-wide phone map: the labels and the
  // gallery button never shrink; only the facts list scrolls.
  const container = document.createElement("div");
  Object.assign(container.style, {
    width: "240px",
    maxHeight: "240px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, sans-serif",
    padding: "8px 4px 4px",
  });

  const notice = document.createElement("p");
  notice.textContent = "Demo — not available for purchase";
  notice.style.cssText =
    "margin:0 0 6px;flex-shrink:0;align-self:flex-start;background:#FEF3C7;color:#78350F;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:600";
  container.appendChild(notice);

  const role = document.createElement("p");
  role.textContent = `${pin.role === "seller" ? "Seller offer" : "Buyer need"} · Presentation only`;
  role.style.cssText = "margin:0 0 2px;flex-shrink:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#616161";
  container.appendChild(role);

  const title = document.createElement("p");
  title.textContent = pin.title;
  title.style.cssText = "margin:0 0 2px;flex-shrink:0;font-size:14px;font-weight:600;color:#090909";
  container.appendChild(title);

  const company = document.createElement("p");
  company.textContent = pin.company;
  company.style.cssText = "margin:0 0 6px;flex-shrink:0;font-size:12px;color:#616161";
  container.appendChild(company);

  // Keyboard-scrollable region so every fact and uncertainty label stays reachable.
  const facts = document.createElement("dl");
  facts.tabIndex = 0;
  facts.setAttribute("role", "region");
  facts.setAttribute("aria-label", `Details for demo example ${pin.title}`);
  facts.style.cssText =
    "margin:0;flex:1 1 auto;min-height:0;overflow-y:auto;font-size:11px;line-height:1.4;color:#424242";
  for (const fact of [...pin.facts, ...(pin.distance ? [{ label: "Distance", value: pin.distance }] : [])]) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = `${fact.label}: `;
    term.style.cssText = "display:inline;font-weight:600";
    const value = document.createElement("dd");
    value.textContent = fact.value;
    value.style.cssText = "display:inline;margin:0";
    row.append(term, value);
    facts.appendChild(row);
  }
  container.appendChild(facts);

  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "Open in demo gallery";
  open.style.cssText =
    "flex-shrink:0;margin-top:8px;width:100%;padding:8px 12px;background:#FFFFFF;color:#090909;border:1px solid #BDBDBD;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer";
  open.addEventListener("click", (e) => {
    e.stopPropagation();
    onView(pin.key);
  });
  container.appendChild(open);
  return container;
}

function buildPopupContent(
  listing: MapListing,
  onView?: (id: string) => void,
): HTMLDivElement {
  const container = document.createElement("div");
  Object.assign(container.style, {
    width: "240px",
    fontFamily: "Inter, sans-serif",
    overflow: "hidden",
    borderRadius: "8px",
  });

  if (listing.image) {
    const imgWrap = document.createElement("div");
    Object.assign(imgWrap.style, {
      width: "100%",
      height: "120px",
      overflow: "hidden",
      background: "#F5F5F5",
    });
    const img = document.createElement("img");
    img.src = listing.image;
    img.alt = listing.title;
    const showIllustration = () => {
      if (!materialImage(listing.title) || img.dataset.illustrative) return;
      img.dataset.illustrative = "true";
      img.src = materialImage(listing.title)!;
      img.alt = `Illustrative image of ${listing.title}`;
      const caption = document.createElement("span");
      caption.textContent = "Illustrative image";
      caption.style.cssText =
        "position:absolute;bottom:4px;left:4px;background:white;border-radius:8px;padding:2px 6px;font-size:10px";
      imgWrap.style.position = "relative";
      imgWrap.appendChild(caption);
    };
    img.addEventListener("error", showIllustration);
    img.addEventListener("load", () => {
      if (img.naturalWidth <= 1 && img.naturalHeight <= 1) showIllustration();
    });
    Object.assign(img.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    });
    if (isMaterialIllustration(listing.image)) showIllustration();
    imgWrap.appendChild(img);
    container.appendChild(imgWrap);
  }

  const body = document.createElement("div");
  Object.assign(body.style, { padding: "10px 4px 4px" });

  const title = document.createElement("p");
  title.textContent = listing.title;
  Object.assign(title.style, {
    fontWeight: "600",
    fontSize: "14px",
    margin: "0 0 4px",
    color: "#090909",
  });
  body.appendChild(title);

  const loc = document.createElement("p");
  loc.textContent = listing.approximate
    ? `Approximate city: ${listing.location}`
    : listing.location;
  Object.assign(loc.style, {
    fontSize: "12px",
    color: "#616161",
    margin: "0 0 6px",
  });
  body.appendChild(loc);

  const badges = document.createElement("div");
  Object.assign(badges.style, {
    display: "flex",
    gap: "4px",
    marginBottom: "8px",
  });
  [listing.moq, listing.co2].forEach((text) => {
    const badge = document.createElement("span");
    badge.textContent = text;
    Object.assign(badge.style, {
      background: "#F5F5F5",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      color: "#424242",
    });
    badges.appendChild(badge);
  });
  body.appendChild(badges);

  const price = document.createElement("p");
  Object.assign(price.style, {
    fontWeight: "600",
    fontSize: "16px",
    margin: "0 0 10px",
    color: "#090909",
  });
  price.textContent = listing.price;
  const unitSpan = document.createElement("span");
  unitSpan.textContent = " " + listing.unit;
  Object.assign(unitSpan.style, {
    fontWeight: "400",
    fontSize: "12px",
    color: "#9E9E9E",
  });
  price.appendChild(unitSpan);
  body.appendChild(price);

  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.textContent = "View details";
  Object.assign(viewBtn.style, {
    width: "100%",
    padding: "8px 12px",
    background: "#090909",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  });
  viewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (onView) onView(listing.id);
    else window.location.href = `/browse/${listing.id}`;
  });
  body.appendChild(viewBtn);

  container.appendChild(body);

  return container;
}

interface ListingMapProps {
  listings?: MapListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onView?: (id: string) => void;
  /**
   * Optional origin pin for radius circle (e.g. buyer facility, seller location).
   * When set with `radiusMiles`, draws a circle and a contrasting pin at this location.
   */
  origin?: { lng: number; lat: number; label?: string };
  /** Search radius in miles. Renders a circle around `origin`. */
  radiusMiles?: number;
  /**
   * Listing ID to mark as the actively-displayed feedstock (yellow pin) and,
   * when `origin` is set, draw a route line between origin and this listing.
   */
  activeId?: string;
  /**
   * Draw the dark pin at `origin`. Default true. Set false when another marker
   * (e.g. the viewer "you are here" pin) already marks the same spot.
   */
  showOriginPin?: boolean;
  /**
   * When auto-zooming to the radius circle, also include every listing in the
   * fitted bounds. Default true (good for single-listing detail/calculator maps).
   * Set false to keep the view centered on `origin` + the circle even when
   * listings are spread far away (e.g. the global browse map).
   */
  radiusFitListings?: boolean;
  /** Browse selection uses the chosen listing as the radius center. */
  selectionRadius?: boolean;
  unlocatedSelection?: Listing;
  /** Explains missing pins (e.g. redacted for signed-out visitors); shown over the map. */
  notice?: React.ReactNode;
  /** Called when the visitor picks the map center as the radius origin. */
  onOriginChange?: (origin: { lng: number; lat: number; label: string }) => void;
  /** Viewer location already resolved by the page; avoids a second lookup. */
  viewer?: ViewerLocationState;
  /**
   * Browse maps open around the viewer (or explicit search origin) and offer
   * Recenter / Show all controls. Other maps stay centred on their listings.
   */
  focusViewer?: boolean;
  /** Presentation-only demo examples; selected by `selectedId` === pin key. */
  demoPins?: DemoMapPin[];
  /** Opens a demo pin's example in the demo gallery. */
  onViewDemo?: (key: string) => void;
}

function applyCameraPlan(map: maplibregl.Map, plan: CameraPlan) {
  if (plan.kind === "none") return;
  if (plan.kind === "center") {
    map.jumpTo({ center: [plan.center.lng, plan.center.lat], zoom: plan.zoom });
    return;
  }
  // The radius circle is a reference overlay; only its envelope is fitted, not
  // every listing, so a global catalogue does not zoom out to world scale.
  const bounds = new maplibregl.LngLatBounds();
  plan.points.forEach((point) => bounds.extend([point.lng, point.lat]));
  if (plan.radius) {
    const { origin, miles } = plan.radius;
    const dLat = miles / 69;
    const dLng = miles / (69 * Math.max(0.1, Math.cos((origin.lat * Math.PI) / 180)));
    bounds.extend([origin.lng - dLng, origin.lat - dLat]);
    bounds.extend([origin.lng + dLng, origin.lat + dLat]);
  }
  if (!bounds.isEmpty())
    map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
}

/**
 * Approximate a circle as a 64-vertex polygon (GeoJSON) around an lng/lat center
 * with a radius in miles. Good enough for marketplace radii — we're not
 * doing geodesics for navigation.
 */
function circlePolygon(
  lng: number,
  lat: number,
  radiusMiles: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const radiusKm = radiusMiles * 1.609344;
  const earthRadiusKm = 6371;
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const dByR = radiusKm / earthRadiusKm;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(dByR) +
        Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
        Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]!);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

function buildViewerPopupContent(location: ViewerLocation): HTMLDivElement {
  const container = document.createElement("div");
  const sourceLabel = viewerSourceDescription(location.source);

  Object.assign(container.style, {
    width: "210px",
    padding: "10px 12px",
    fontFamily: "Inter, sans-serif",
  });

  const title = document.createElement("p");
  title.textContent = viewerSourceTitle(location.source);
  Object.assign(title.style, {
    margin: "0 0 4px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#090909",
  });
  container.appendChild(title);

  const label = document.createElement("p");
  label.textContent = `${location.label} · ${sourceLabel}`;
  Object.assign(label.style, {
    margin: "0",
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#616161",
  });
  container.appendChild(label);

  return container;
}

function createViewerMarkerElement() {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Your location");
  el.style.cssText =
    "width:28px;height:28px;border-radius:50%;background:#0F62FE;border:3px solid white;box-shadow:0 0 0 8px rgba(15,98,254,0.18),0 3px 10px rgba(0,0,0,0.25);";
  return el;
}

export function ListingMap({
  listings,
  selectedId,
  onSelect,
  onView,
  origin: suppliedOrigin,
  radiusMiles,
  activeId,
  showOriginPin = true,
  radiusFitListings = true,
  selectionRadius = false,
  unlocatedSelection,
  notice,
  onOriginChange,
  viewer,
  focusViewer = false,
  demoPins = EMPTY_DEMO_PINS,
  onViewDemo,
}: ListingMapProps = {}) {
  const city = useCityLocation(unlocatedSelection?.cityLocation);
  const data = useMemo(() => {
    const exact = listings ?? EMPTY_LISTINGS;
    if (!unlocatedSelection || !city.location) return exact;
    return [
      ...exact,
      {
        id: unlocatedSelection.id,
        title: unlocatedSelection.title,
        location: city.location.label,
        price: unlocatedSelection.price,
        unit:
          unlocatedSelection.priceNum !== null ? unlocatedSelection.unit : "",
        moq: unlocatedSelection.moq,
        co2: unlocatedSelection.co2,
        image: unlocatedSelection.image ?? undefined,
        lat: city.location.lat,
        lng: city.location.lng,
        approximate: true,
      },
    ];
  }, [listings, unlocatedSelection, city.location]);
  const selectionNotice = !unlocatedSelection
    ? undefined
    : city.location
      ? `Approximate city location: ${city.location.label}. The seller has not saved an exact facility pin.`
      : city.loading
        ? "Finding approximate city location…"
        : "No unique city location found. The seller needs to save a facility pin.";
  const [manualOrigin, setManualOrigin] = useState<{
    lng: number;
    lat: number;
    label: string;
  }>();
  const selectedListing = selectionRadius
    ? data.find((item) => item.id === selectedId)
    : undefined;
  const effectiveOrigin = selectedListing
    ? {
        lng: selectedListing.lng,
        lat: selectedListing.lat,
        label: selectedListing.approximate
          ? `Approximate city: ${selectedListing.location}`
          : selectedListing.title,
      }
    : (suppliedOrigin ?? manualOrigin);
  const originLng = effectiveOrigin?.lng;
  const originLat = effectiveOrigin?.lat;
  const originLabel = effectiveOrigin?.label;
  const origin = useMemo(
    () =>
      originLng === undefined || originLat === undefined
        ? undefined
        : { lng: originLng, lat: originLat, label: originLabel },
    [originLng, originLat, originLabel],
  );
  const [mapError, setMapError] = useState(false);
  const selectRef = useRef(onSelect);
  const viewRef = useRef(onView);
  const viewDemoRef = useRef(onViewDemo);
  useEffect(() => {
    selectRef.current = onSelect;
    viewRef.current = onView;
    viewDemoRef.current = onViewDemo;
  }, [onSelect, onView, onViewDemo]);
  const ownViewer = useViewerLocation({ enabled: !viewer });
  const { location: viewerLocation, status: viewerStatus } = viewer ?? ownViewer;
  // "auto" follows the viewer/listings, "all" fits every listing, and "manual"
  // means the visitor moved the map, so async updates must not move it back.
  const [camera, setCamera] = useState<CameraState>({ mode: "auto", context: "", nonce: 0 });
  // Read by map event listeners registered once at map creation.
  const contextRef = useRef("");
  const lastCameraKeyRef = useRef<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<
      string,
      { marker: maplibregl.Marker; popup: maplibregl.Popup; el: HTMLDivElement }
    >
  >(new globalThis.Map());
  const demoMarkersRef = useRef<
    Map<
      string,
      { marker: maplibregl.Marker; popup: maplibregl.Popup; el: HTMLDivElement; pin: DemoMapPin }
    >
  >(new globalThis.Map());
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const viewerMarkerRef = useRef<{
    marker: maplibregl.Marker;
    popup: maplibregl.Popup;
  } | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Serve the matching module worker directly; bundling its import URL can
    // leave GeoJSON overlays waiting indefinitely while raster tiles still load.
    maplibregl.setWorkerUrl(
      new URL("/vendor/maplibre/maplibre-gl-worker.mjs", window.location.origin)
        .href,
    );
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: STREET_STYLE,
      attributionControl: { compact: false },
      maxZoom: 19,
      renderWorldCopies: false,
      // Neutral world view until a listing, origin or viewer location is known.
      center: [0, 20],
      zoom: 1,
    });
    const markManual = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent)
        setCamera((current) => ({ ...current, mode: "manual", context: contextRef.current }));
    };
    mapInstance.on("dragstart", markManual);
    mapInstance.on("zoomstart", markManual);
    mapInstance.on("rotatestart", markManual);
    mapInstance.on("pitchstart", markManual);

    mapInstance.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = mapInstance;
    mapInstance.on("error", () => setMapError(true));
    mapInstance.on("idle", () => {
      if (mapInstance.areTilesLoaded()) setMapError(false);
    });
    const resize = new ResizeObserver(() => mapInstance.resize());
    resize.observe(mapContainer.current);
    const markers = markersRef.current;

    return () => {
      resize.disconnect();
      mapInstance.remove();
      mapRef.current = null;
      markers.clear();
      viewerMarkerRef.current = null;
    };
  }, []);

  // Sync markers to listings
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // Clear existing
    markersRef.current.forEach(({ marker, popup }) => {
      marker.remove();
      popup.remove();
    });
    markersRef.current.clear();

    data.forEach((listing) => {
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${listing.title} — ${listing.location}`);
      el.tabIndex = 0;
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          el.click();
        }
      });
      const isActive = listing.id === activeId;
      const bg = isActive ? "#FFD600" : "#378853";
      const border = isActive ? "#1F2937" : "white";
      el.style.cssText = `width:${isActive ? 28 : 24}px;height:${isActive ? 28 : 24}px;border-radius:50%;background:${bg};border:2.5px solid ${border};cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);transition:transform 150ms ease, background 150ms ease;`;

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        maxWidth: "260px",
      })
        .setLngLat([listing.lng, listing.lat])
        .setDOMContent(
          buildPopupContent(listing, (id) =>
            viewRef.current
              ? viewRef.current(id)
              : window.location.assign(`/browse/${id}`),
          ),
        );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([listing.lng, listing.lat])
        .addTo(mapInstance);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectRef.current?.(listing.id);
      });

      markersRef.current.set(listing.id, { marker, popup, el });
    });
  }, [data, activeId]);

  // Demo pins: a distinct diamond marker per role and a demo-only popup.
  // Each run owns the markers/popups it allocates in `owned`; its cleanup
  // (new pins or unmount) removes exactly those and releases the shared ref
  // only if it still points at them.
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    const owned: typeof demoMarkersRef.current = new globalThis.Map();
    demoMarkersRef.current = owned;

    demoPins.forEach((pin) => {
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.setAttribute(
        "aria-label",
        `Demo ${pin.role === "seller" ? "seller offer" : "buyer need"}, not available for purchase: ${pin.title} — ${pin.company}`,
      );
      el.tabIndex = 0;
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          el.click();
        }
      });
      el.style.cssText = `width:18px;height:18px;transform:rotate(45deg);border-radius:3px;background:${DEMO_PIN_COLORS[pin.role].fill};border:2.5px solid white;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);`;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false, maxWidth: "260px" })
        .setLngLat([pin.lng, pin.lat])
        .setDOMContent(buildDemoPopupContent(pin, (key) => viewDemoRef.current?.(key)));
      // The map's status/notice overlays (z-10 or later in the DOM) would
      // otherwise sit over an open popup and take its clicks on small maps.
      // Raise only this popup, only while it is open; controls elsewhere keep working.
      popup.on("open", () => {
        popup.getElement()?.style.setProperty("z-index", "20");
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(mapInstance);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectRef.current?.(pin.key);
      });
      owned.set(pin.key, { marker, popup, el, pin });
    });

    return () => {
      owned.forEach(({ marker, popup }) => {
        popup.remove();
        marker.remove();
      });
      owned.clear();
      if (demoMarkersRef.current === owned) demoMarkersRef.current = new globalThis.Map();
    };
  }, [demoPins]);

  // Keep camera fitting independent of asynchronous style/overlay loading.
  const context = cameraContext(selectedId, radiusMiles);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  const cameraMode = effectiveCameraMode(camera, context);
  const cameraPlan = useMemo(
    () =>
      planCamera({
        points: [...data, ...demoPins].map(({ lng, lat }) => ({ lng, lat })),
        origin: origin && { lng: origin.lng, lat: origin.lat },
        radiusMiles,
        radiusFitListings,
        selectedId,
        selectionRadius,
        selectedPoint: selectedListing && {
          lng: selectedListing.lng,
          lat: selectedListing.lat,
        },
        viewer: viewerLocation && { lng: viewerLocation.lng, lat: viewerLocation.lat },
        focusViewer,
        mode: cameraMode,
      }),
    [
      data,
      demoPins,
      origin,
      radiusMiles,
      radiusFitListings,
      selectedId,
      selectionRadius,
      selectedListing,
      viewerLocation,
      focusViewer,
      cameraMode,
    ],
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Re-applying an identical plan would undo small adjustments for nothing;
    // the nonce lets a repeated explicit click re-apply it on purpose.
    const key = `${camera.nonce}:${JSON.stringify(cameraPlan)}`;
    if (key === lastCameraKeyRef.current) return;
    lastCameraKeyRef.current = key;
    applyCameraPlan(map, cameraPlan);
  }, [cameraPlan, camera.nonce]);

  // On small screens the map can be hidden (display:none) behind the results
  // while a selection is made. When it becomes visible again, resize and
  // re-apply the camera: centre on a selected demo pin, otherwise the plan.
  const revealRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    revealRef.current = () => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      const pin = selectedId ? demoPins.find((item) => item.key === selectedId) : undefined;
      if (pin) map.jumpTo({ center: [pin.lng, pin.lat], zoom: 9 });
      else applyCameraPlan(map, cameraPlan);
    };
  }, [selectedId, demoPins, cameraPlan]);
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    let hidden = container.clientWidth === 0 || container.clientHeight === 0;
    const observer = new ResizeObserver(() => {
      const nowHidden = container.clientWidth === 0 || container.clientHeight === 0;
      if (hidden && !nowHidden) revealRef.current();
      hidden = nowHidden;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const recenterOnViewer = () => {
    if (!viewerLocation) return;
    setCamera((current) => ({ mode: "viewer", context, nonce: current.nonce + 1 }));
  };
  const showAllListings = () => {
    setCamera((current) => ({ mode: "all", context, nonce: current.nonce + 1 }));
  };

  // Sync origin pin + radius circle (map renderer)

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const SOURCE_ID = "radius-source";
    const FILL_ID = "radius-fill";
    const OUTLINE_ID = "radius-outline";
    const ROUTE_SOURCE_ID = "route-source";
    const ROUTE_LINE_ID = "route-line";

    const apply = () => {
      // Clean up existing
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      [ROUTE_LINE_ID].forEach((id) => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      });
      [ROUTE_SOURCE_ID].forEach((id) => {
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      });

      if (!origin || !radiusMiles || radiusMiles <= 0) {
        if (mapInstance.getLayer(FILL_ID))
          mapInstance.setLayoutProperty(FILL_ID, "visibility", "none");
        if (mapInstance.getLayer(OUTLINE_ID))
          mapInstance.setLayoutProperty(OUTLINE_ID, "visibility", "none");
        if (!origin) return;
      }

      // Origin pin (distinct from listings). Skipped when another marker
      // already represents this spot (e.g. the viewer "you are here" pin).
      if (showOriginPin) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:22px;height:22px;border-radius:50%;background:#1F2937;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
        originMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([origin.lng, origin.lat])
          .addTo(mapInstance);
      }

      // Route line from origin to active feedstock
      const activeListing = activeId
        ? data.find((l) => l.id === activeId)
        : undefined;
      const hasRouteLine = !!activeListing;
      if (activeListing) {
        const route: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [origin.lng, origin.lat],
              [activeListing.lng, activeListing.lat],
            ],
          },
          properties: {},
        };
        mapInstance.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: route,
        });
        mapInstance.addLayer({
          id: ROUTE_LINE_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#7C3AED",
            "line-width": 4,
            "line-opacity": 0.85,
          },
        });
      }

      if (!radiusMiles || radiusMiles <= 0) return;

      const polygon = circlePolygon(origin.lng, origin.lat, radiusMiles);
      const source = mapInstance.getSource<maplibregl.GeoJSONSource>(SOURCE_ID);
      if (source) {
        source.setData(polygon);
        mapInstance.setLayoutProperty(FILL_ID, "visibility", "visible");
        mapInstance.setLayoutProperty(OUTLINE_ID, "visibility", "visible");
        return;
      }
      mapInstance.addSource(SOURCE_ID, {
        type: "geojson",
        data: polygon,
      });
      mapInstance.addLayer(
        {
          id: FILL_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": "#22C55E",
            "fill-opacity": 0.22,
          },
        },
        // Insert the radius fill UNDER the route line when the route exists,
        // otherwise let the map stack it on top normally.
        hasRouteLine ? ROUTE_LINE_ID : undefined,
      );
      mapInstance.addLayer({
        id: OUTLINE_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#15803D",
          "line-width": 3,
          "line-dasharray": [3, 2],
        },
      });
    };

    // Style readiness is sufficient for overlays; idle also waits for every
    // street tile and may never arrive on a slow or interrupted tile request.
    mapInstance.on("style.load", apply);
    if (mapInstance.getStyle()?.layers) apply();
    return () => {
      mapInstance.off("style.load", apply);
    };
  }, [origin, radiusMiles, activeId, data, showOriginPin, radiusFitListings]);

  // Sync viewer ("you are here") marker (map renderer)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    viewerMarkerRef.current?.marker.remove();
    viewerMarkerRef.current?.popup.remove();
    viewerMarkerRef.current = null;

    if (!viewerLocation) return;

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
      maxWidth: "240px",
    }).setDOMContent(buildViewerPopupContent(viewerLocation));

    const marker = new maplibregl.Marker({
      element: createViewerMarkerElement(),
    })
      .setLngLat([viewerLocation.lng, viewerLocation.lat])
      .setPopup(popup)
      .addTo(mapInstance);

    viewerMarkerRef.current = { marker, popup };
  }, [viewerLocation]);

  // React to selection changes — fly to and highlight
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    markersRef.current.forEach(({ el, popup }, id) => {
      if (id === selectedId) {
        el.style.background = "#1F5F3A";
        popup.addTo(mapInstance);
      } else {
        el.style.background = "#378853";
        popup.remove();
      }
    });
    demoMarkersRef.current.forEach(({ el, popup, pin }, key) => {
      const colors = DEMO_PIN_COLORS[pin.role];
      if (key === selectedId) {
        el.style.background = colors.selected;
        popup.addTo(mapInstance);
      } else {
        el.style.background = colors.fill;
        popup.remove();
      }
    });

    if (selectedId) {
      const demoTarget = demoPins.find((pin) => pin.key === selectedId);
      if (demoTarget) {
        mapInstance.flyTo({ center: [demoTarget.lng, demoTarget.lat], zoom: 9, duration: 900, essential: true });
        return;
      }
      const target = data.find((l) => l.id === selectedId);
      if (target && !selectionRadius) {
        mapInstance.flyTo({
          center: [target.lng, target.lat],
          zoom: 13,
          duration: 900,
          essential: true,
        });
      }
    }
  }, [selectedId, data, demoPins, origin, radiusMiles, viewerLocation, selectionRadius]);

  return (
    <div className="relative h-full w-full">
      {selectionNotice && (
        <div
          role="status"
          className="absolute left-3 top-16 z-10 max-w-sm rounded-lg bg-white p-3 text-sm shadow"
        >
          {selectionNotice}
          {city.location && unlocatedSelection && (
            <a
              className="mt-1 block text-xs underline"
              href="https://github.com/lutangar/cities.json"
              target="_blank"
              rel="noreferrer"
            >
              City data: GeoNames / cities.json (CC BY 4.0)
            </a>
          )}
        </div>
      )}
      {!origin && (
        <button
          type="button"
          className="absolute left-3 top-3 z-10 rounded-lg bg-white p-3 text-sm shadow"
          onClick={() => {
            const center = mapRef.current?.getCenter();
            if (center) {
              const picked = {
                lng: center.lng,
                lat: center.lat,
                label: "Selected map center",
              };
              setManualOrigin(picked);
              onOriginChange?.(picked);
            }
          }}
        >
          Use map center for search radius
        </button>
      )}
      {mapError && (
        <div
          role="alert"
          className="absolute left-3 top-3 z-10 rounded-lg bg-white p-3 text-sm shadow"
        >
          Street map could not load.{" "}
          <button
            className="underline"
            onClick={() => mapRef.current?.setStyle(STREET_STYLE)}
          >
            Retry map
          </button>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
      {notice && !selectionNotice && (
        <div
          role="status"
          className="absolute bottom-16 left-1/2 z-10 w-[min(360px,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg bg-white p-3 text-center text-sm text-neutral-700 shadow"
        >
          {notice}
        </div>
      )}
      {focusViewer && (
        <div className="absolute bottom-16 left-3 z-10 flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={recenterOnViewer}
            disabled={!viewerLocation}
            title={viewerLocation ? undefined : "Your location is not available"}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            Recenter on my location
          </button>
          <button
            type="button"
            onClick={showAllListings}
            disabled={data.length + demoPins.length === 0}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            Show all listings
          </button>
        </div>
      )}
      {demoPins.length > 0 && (
        <div className="absolute right-3 top-14 z-10 flex flex-col gap-1 rounded-md bg-white/95 px-2 py-1.5 text-[11px] font-medium text-neutral-700 shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: "#378853" }} aria-hidden="true" />
            Marketplace listing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rotate-45 rounded-[2px]" style={{ background: DEMO_PIN_COLORS.seller.fill }} aria-hidden="true" />
            Demo seller offer (not for sale)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rotate-45 rounded-[2px]" style={{ background: DEMO_PIN_COLORS.buyer.fill }} aria-hidden="true" />
            Demo buyer need
          </span>
        </div>
      )}
      <div
        role="status"
        className="absolute bottom-8 left-3 max-w-[280px] rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-700 shadow-sm backdrop-blur-sm"
      >
        {origin && radiusMiles
          ? `${radiusMiles} mi radius · ${origin.label ?? "Selected location"}`
          : viewerLocationCaption(viewerLocation, viewerStatus)}
      </div>
    </div>
  );
}
