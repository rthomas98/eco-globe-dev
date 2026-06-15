"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { type ViewerLocation, useViewerLocation } from "@/lib/viewer-location";

interface SellerLocationMapProps {
  lng: number;
  lat: number;
  heightClassName?: string;
}

function isValidToken(t: string | undefined): t is string {
  return !!t && t !== "placeholder" && t.startsWith("pk.");
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

function getFallbackPoint(
  lng: number,
  lat: number,
  viewerLocation?: ViewerLocation | null,
) {
  const lngs = [lng, ...(viewerLocation ? [viewerLocation.lng] : [])];
  const lats = [lat, ...(viewerLocation ? [viewerLocation.lat] : [])];
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padX = (maxLng - minLng) * 0.2 || 0.3;
  const padY = (maxLat - minLat) * 0.2 || 0.3;
  const lngRange = maxLng - minLng + padX * 2 || 1;
  const latRange = maxLat - minLat + padY * 2 || 1;

  return (pointLng: number, pointLat: number) => ({
    xPct: ((pointLng - minLng + padX) / lngRange) * 100,
    yPct: (1 - (pointLat - minLat + padY) / latRange) * 100,
  });
}

export function SellerLocationMap({
  lng,
  lat,
  heightClassName = "h-[280px]",
}: SellerLocationMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const validToken = isValidToken(token);
  const { location: viewerLocation } = useViewerLocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const viewerMarkerRef = useRef<{ marker: mapboxgl.Marker; popup: mapboxgl.Popup } | null>(null);

  useEffect(() => {
    if (!validToken) return;
    if (!mapContainer.current) return;

    mapboxgl.accessToken = token!;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    new mapboxgl.Marker(createSellerMarkerElement()).setLngLat([lng, lat]).addTo(map);
    mapRef.current = map;

    return () => {
      viewerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [lng, lat, token, validToken]);

  useEffect(() => {
    if (!validToken) return;
    const map = mapRef.current;
    if (!map) return;

    viewerMarkerRef.current?.marker.remove();
    viewerMarkerRef.current?.popup.remove();
    viewerMarkerRef.current = null;

    if (!viewerLocation) return;

    const popup = new mapboxgl.Popup({
      offset: 18,
      closeButton: false,
      maxWidth: "240px",
    }).setDOMContent(buildViewerPopupContent(viewerLocation));

    const marker = new mapboxgl.Marker(createViewerMarkerElement())
      .setLngLat([viewerLocation.lng, viewerLocation.lat])
      .setPopup(popup)
      .addTo(map);

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([lng, lat]);
    bounds.extend([viewerLocation.lng, viewerLocation.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 600 });

    viewerMarkerRef.current = { marker, popup };
  }, [lng, lat, validToken, viewerLocation]);

  if (!validToken) {
    const toPoint = getFallbackPoint(lng, lat, viewerLocation);
    const seller = toPoint(lng, lat);
    const viewer = viewerLocation
      ? toPoint(viewerLocation.lng, viewerLocation.lat)
      : null;

    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl ${heightClassName}`}
        style={{
          background:
            "linear-gradient(135deg, #E8F1ED 0%, #F4F8F2 50%, #E0EAE3 100%)",
        }}
      >
        <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
          <defs>
            <pattern id="grid-detail-location" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#C8D7CD" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-detail-location)" />
        </svg>

        <div
          className="absolute z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${seller.xPct}%`,
            top: `${seller.yPct}%`,
            background: "#378853",
            border: "2.5px solid white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
          aria-label="Seller location"
        />

        {viewer && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${viewer.xPct}%`, top: `${viewer.yPct}%` }}
            aria-label="Your location"
            title="Your location"
          >
            <div
              className="size-7 rounded-full bg-blue-600"
              style={{
                border: "3px solid white",
                boxShadow: "0 0 0 8px rgba(37,99,235,0.18), 0 3px 10px rgba(0,0,0,0.25)",
              }}
            />
            <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700 shadow-sm">
              You are here
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 max-w-[260px] rounded-md bg-white/85 px-2 py-1 text-[10px] font-medium text-neutral-700 backdrop-blur-sm">
          {getViewerLocationLabel(viewerLocation)}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${heightClassName}`}>
      <div ref={mapContainer} className="h-full w-full rounded-xl" />
      <div className="absolute bottom-3 left-3 max-w-[280px] rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
        {getViewerLocationLabel(viewerLocation)}
      </div>
    </div>
  );
}
