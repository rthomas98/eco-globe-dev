"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { materialImage, isMaterialIllustration } from "@/lib/material-images";
import { STREET_STYLE } from "@/lib/street-map-style";
import { type ViewerLocation, useViewerLocation } from "@/lib/viewer-location";

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
}

const EMPTY_LISTINGS: MapListing[] = [];


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
      if (
        !materialImage(listing.title) ||
        img.dataset.illustrative
      )
        return;
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
  loc.textContent = listing.location;
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
}

/**
 * Build the LngLatBounds we want the map to fit. Includes the listings and
 * the optional origin pin. We DO NOT extend by the radius envelope — the
 * radius circle is a reference overlay and can run past the viewport (mapbox
 * clips it). Including the envelope made the demo zoom out to continent scale.
 */
function buildBounds(
  data: MapListing[],
  origin?: { lng: number; lat: number },
): maplibregl.LngLatBounds {
  const bounds = new maplibregl.LngLatBounds();
  data.forEach((l) => bounds.extend([l.lng, l.lat]));
  if (origin) bounds.extend([origin.lng, origin.lat]);
  return bounds;
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
  const sourceLabel =
    location.source === "browser"
      ? "Approximate login location"
      : "Saved company location";

  Object.assign(container.style, {
    width: "210px",
    padding: "10px 12px",
    fontFamily: "Inter, sans-serif",
  });

  const title = document.createElement("p");
  title.textContent = "You are here";
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

function extendBoundsWithMapData(
  bounds: maplibregl.LngLatBounds,
  data: MapListing[],
  viewerLocation?: ViewerLocation | null,
) {
  data.forEach((l) => bounds.extend([l.lng, l.lat]));
  if (viewerLocation) bounds.extend([viewerLocation.lng, viewerLocation.lat]);
}

function getViewerLocationLabel(viewerLocation?: ViewerLocation | null) {
  if (!viewerLocation)
    return "Enable location to show where you are browsing from";
  return viewerLocation.source === "browser"
    ? "Showing your approximate login location"
    : `Showing saved company location: ${viewerLocation.label}`;
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
}: ListingMapProps = {}) {
  const data = listings ?? EMPTY_LISTINGS;
  const originLng = suppliedOrigin?.lng;
  const originLat = suppliedOrigin?.lat;
  const originLabel = suppliedOrigin?.label;
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
  useEffect(() => {
    selectRef.current = onSelect;
    viewRef.current = onView;
  }, [onSelect, onView]);
  const { location: viewerLocation } = useViewerLocation();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<
      string,
      { marker: maplibregl.Marker; popup: maplibregl.Popup; el: HTMLDivElement }
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
    maplibregl.setWorkerUrl(new URL("/vendor/maplibre/maplibre-gl-worker.mjs", window.location.origin).href);
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: STREET_STYLE,
      attributionControl: { compact: false },
      maxZoom: 19,
      renderWorldCopies: false,
      center: [-91.15, 30.45],
      zoom: 8.5,
    });

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

  // Keep camera fitting independent of asynchronous style/overlay loading.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId) return;
    const hasRadius = origin && radiusMiles && radiusMiles > 0;
    const bounds = buildBounds(hasRadius && !radiusFitListings ? [] : data, origin);
    extendBoundsWithMapData(bounds, [], viewerLocation);
    if (hasRadius) {
      const dLat = radiusMiles / 69;
      const dLng = radiusMiles / (69 * Math.max(0.1, Math.cos(origin.lat * Math.PI / 180)));
      bounds.extend([origin.lng - dLng, origin.lat - dLat]);
      bounds.extend([origin.lng + dLng, origin.lat + dLat]);
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
  }, [data, origin, radiusMiles, radiusFitListings, viewerLocation, selectedId]);

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
      [FILL_ID, OUTLINE_ID, ROUTE_LINE_ID].forEach((id) => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      });
      [SOURCE_ID, ROUTE_SOURCE_ID].forEach((id) => {
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      });

      if (!origin) return;

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

    if (selectedId) {
      const target = data.find((l) => l.id === selectedId);
      if (target) {
        mapInstance.flyTo({
          center: [target.lng, target.lat],
          zoom: 13,
          duration: 900,
          essential: true,
        });
      }
    }
  }, [selectedId, data, origin, radiusMiles, viewerLocation]);

  return (
    <div className="relative h-full w-full">
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
      <div className="absolute bottom-8 left-3 max-w-[280px] rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
        {getViewerLocationLabel(viewerLocation)}
      </div>
    </div>
  );
}
