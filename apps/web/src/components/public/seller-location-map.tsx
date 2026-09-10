"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { STREET_STYLE } from "@/lib/street-map-style";
import "maplibre-gl/dist/maplibre-gl.css";
import { type ViewerLocation, useViewerLocation } from "@/lib/viewer-location";

interface SellerLocationMapProps {
  lng: number;
  lat: number;
  heightClassName?: string;
}

function createSellerMarkerElement() {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Seller location");
  el.style.cssText =
    "width:24px;height:24px;border-radius:50%;background:#378853;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);";
  return el;
}

function createViewerMarkerElement() {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Your location");
  el.style.cssText =
    "width:28px;height:28px;border-radius:50%;background:#0F62FE;border:3px solid white;box-shadow:0 0 0 8px rgba(15,98,254,0.18),0 3px 10px rgba(0,0,0,0.25);";
  return el;
}

function getViewerLocationLabel(viewerLocation?: ViewerLocation | null) {
  if (!viewerLocation) return "Enable location to show where you are browsing from";
  return viewerLocation.source === "browser"
    ? "Showing your approximate login location"
    : `Showing saved company location: ${viewerLocation.label}`;
}

function buildViewerPopupContent(location: ViewerLocation): HTMLDivElement {
  const container = document.createElement("div");
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

  const detail = document.createElement("p");
  detail.textContent =
    location.source === "browser"
      ? "Approximate login location"
      : `Saved company location · ${location.label}`;
  Object.assign(detail.style, {
    margin: "0",
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#616161",
  });
  container.appendChild(detail);

  return container;
}

export function SellerLocationMap({
  lng,
  lat,
  heightClassName = "h-[280px]",
}: SellerLocationMapProps) {
  const [mapError, setMapError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { location: viewerLocation } = useViewerLocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const viewerMarkerRef = useRef<{ marker: maplibregl.Marker; popup: maplibregl.Popup } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STREET_STYLE,
      center: [lng, lat],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    new maplibregl.Marker({ element: createSellerMarkerElement() }).setLngLat([lng, lat]).addTo(map);
    mapRef.current = map;
    map.on("error", () => setMapError(true));
    map.on("idle", () => { if (map.areTilesLoaded()) setMapError(false); });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapContainer.current);

    return () => {
      observer.disconnect();
      viewerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [lng, lat, retry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    viewerMarkerRef.current?.marker.remove();
    viewerMarkerRef.current?.popup.remove();
    viewerMarkerRef.current = null;

    if (!viewerLocation) return;

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
      maxWidth: "240px",
    }).setDOMContent(buildViewerPopupContent(viewerLocation));

    const marker = new maplibregl.Marker({ element: createViewerMarkerElement() })
      .setLngLat([viewerLocation.lng, viewerLocation.lat])
      .setPopup(popup)
      .addTo(map);

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([lng, lat]);
    bounds.extend([viewerLocation.lng, viewerLocation.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 600 });

    viewerMarkerRef.current = { marker, popup };
  }, [lng, lat, retry, viewerLocation]);


  return (
    <div className={`relative w-full ${heightClassName}`}>
      {mapError && <div role="status" className="absolute left-3 top-3 z-10 rounded-md bg-white p-2 text-xs shadow">Street map could not load. <button className="underline" onClick={() => { setMapError(false); setRetry((value) => value + 1); }}>Retry</button></div>}
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
      <div className="absolute bottom-8 left-3 max-w-[280px] rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
        {getViewerLocationLabel(viewerLocation)}
      </div>
    </div>
  );
}
