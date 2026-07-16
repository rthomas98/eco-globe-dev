"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Route, Truck } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type LngLat = [number, number];
type StopKind = "origin" | "stop" | "destination";

interface RouteStop {
  label: string;
  coordinate: LngLat;
  kind: StopKind;
}

interface ShipmentMapData {
  id: string;
  material: string;
  carrier: string;
  origin: string;
  destination: string;
  route: {
    coordinates: LngLat[];
    currentCoordinate: LngLat;
    progressCoordinateCount: number;
    stops: RouteStop[];
  };
}

export interface ShipmentTrackingMapProps {
  shipment: ShipmentMapData;
  status: string;
}

const ROUTE_SOURCE_ID = "shipment-route-source";
const PROGRESS_SOURCE_ID = "shipment-progress-source";
const ROUTE_LAYER_ID = "shipment-route-line";
const PROGRESS_LAYER_ID = "shipment-progress-line";
const GULF_COAST_CENTER: LngLat = [-93.4, 30.4];

function isValidToken(token: string | undefined): token is string {
  return !!token && token !== "placeholder" && token.startsWith("pk.");
}

function getStatusColor(status: string) {
  if (status === "Exception") return "#DC2626";
  if (status === "Delivered") return "#16A34A";
  if (status === "At facility") return "#059669";
  return "#2563EB";
}

function getStatusTone(status: string) {
  if (status === "Exception") return "bg-red-100 text-red-800";
  if (status === "Delivered") return "bg-emerald-100 text-emerald-800";
  if (status === "At facility") return "bg-teal-100 text-teal-800";
  return "bg-blue-100 text-blue-800";
}

function createMarkerElement(
  kind: StopKind | "current",
  label: string,
  status: string,
) {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("aria-label", label);
  element.title = label;

  const size = kind === "current" ? 34 : kind === "stop" ? 16 : 24;
  const background =
    kind === "current"
      ? getStatusColor(status)
      : kind === "origin"
        ? "#0F172A"
        : kind === "destination"
          ? "#16A34A"
          : "#F59E0B";

  Object.assign(element.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    border: kind === "current" ? "3px solid white" : "2.5px solid white",
    background,
    boxShadow:
      kind === "current"
        ? `0 0 0 8px ${status === "Exception" ? "rgba(220,38,38,0.18)" : "rgba(37,99,235,0.18)"}, 0 4px 12px rgba(15,23,42,0.28)`
        : "0 2px 8px rgba(15,23,42,0.3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
  });

  if (kind === "current") {
    const center = document.createElement("span");
    center.textContent = "•";
    Object.assign(center.style, {
      color: "white",
      fontSize: "22px",
      lineHeight: "1",
      marginTop: "-2px",
    });
    element.appendChild(center);
  }

  return element;
}

function createPopupContent(title: string, detail: string) {
  const container = document.createElement("div");
  Object.assign(container.style, {
    minWidth: "180px",
    padding: "8px 10px",
    fontFamily: "Inter, sans-serif",
  });

  const heading = document.createElement("p");
  heading.textContent = title;
  Object.assign(heading.style, {
    margin: "0",
    color: "#0F172A",
    fontSize: "13px",
    fontWeight: "700",
  });
  container.appendChild(heading);

  const body = document.createElement("p");
  body.textContent = detail;
  Object.assign(body.style, {
    margin: "4px 0 0",
    color: "#64748B",
    fontSize: "12px",
    lineHeight: "1.4",
  });
  container.appendChild(body);

  return container;
}

function fitMapToRoute(map: mapboxgl.Map, coordinates: LngLat[]) {
  const bounds = new mapboxgl.LngLatBounds();
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  map.fitBounds(bounds, {
    padding: { top: 80, right: 60, bottom: 70, left: 60 },
    maxZoom: 11,
    duration: 700,
  });
}

function removeRouteData(map: mapboxgl.Map) {
  [PROGRESS_LAYER_ID, ROUTE_LAYER_ID].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  [PROGRESS_SOURCE_ID, ROUTE_SOURCE_ID].forEach((id) => {
    if (map.getSource(id)) map.removeSource(id);
  });
}

export function ShipmentTrackingMap({
  shipment,
  status,
}: ShipmentTrackingMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const validToken = isValidToken(token);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!validToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: GULF_COAST_CENTER,
      zoom: 7,
      cooperativeGestures: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.scrollZoom.disable();

    const handleLoad = () => setMapReady(true);
    map.on("load", handleLoad);
    mapRef.current = map;

    return () => {
      map.off("load", handleLoad);
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [token, validToken]);

  useEffect(() => {
    if (!validToken || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    removeRouteData(map);

    const fullRoute: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: { shipmentId: shipment.id },
      geometry: {
        type: "LineString",
        coordinates: shipment.route.coordinates,
      },
    };
    const progressCoordinateCount = Math.max(
      2,
      Math.min(
        shipment.route.progressCoordinateCount,
        shipment.route.coordinates.length,
      ),
    );
    const completedRoute: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: { shipmentId: shipment.id, status },
      geometry: {
        type: "LineString",
        coordinates: shipment.route.coordinates.slice(
          0,
          progressCoordinateCount,
        ),
      },
    };

    map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: fullRoute });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#94A3B8",
        "line-width": 5,
        "line-opacity": 0.8,
        "line-dasharray": [2, 2],
      },
    });

    map.addSource(PROGRESS_SOURCE_ID, {
      type: "geojson",
      data: completedRoute,
    });
    map.addLayer({
      id: PROGRESS_LAYER_ID,
      type: "line",
      source: PROGRESS_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": getStatusColor(status),
        "line-width": 6,
        "line-opacity": 0.95,
      },
    });

    shipment.route.stops.forEach((stop) => {
      const marker = new mapboxgl.Marker({
        element: createMarkerElement(
          stop.kind,
          `${stop.label} shipment stop`,
          status,
        ),
      })
        .setLngLat(stop.coordinate)
        .setPopup(
          new mapboxgl.Popup({ offset: 18, closeButton: false }).setDOMContent(
            createPopupContent(
              stop.label,
              `${shipment.id} · ${shipment.material}`,
            ),
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    const currentMarker = new mapboxgl.Marker({
      element: createMarkerElement(
        "current",
        `Current location for ${shipment.id}`,
        status,
      ),
    })
      .setLngLat(shipment.route.currentCoordinate)
      .setPopup(
        new mapboxgl.Popup({ offset: 22, closeButton: false }).setDOMContent(
          createPopupContent(
            `Current status: ${status}`,
            `${shipment.carrier} · ${shipment.origin} to ${shipment.destination}`,
          ),
        ),
      )
      .addTo(map);
    markersRef.current.push(currentMarker);

    map.resize();
    fitMapToRoute(map, shipment.route.coordinates);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) removeRouteData(mapRef.current);
    };
  }, [mapReady, shipment, status, validToken]);

  const fitSelectedRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToRoute(map, shipment.route.coordinates);
  };

  return (
    <section
      aria-label={`Live shipment map for ${shipment.id}`}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200"
    >
      <div className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MapPin className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-950">
                Live shipment map
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(status)}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-neutral-500">
              {shipment.id} · {shipment.material} · {shipment.carrier}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fitSelectedRoute}
          disabled={!validToken || !mapReady}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          Fit full route
        </button>
      </div>

      <div className="relative h-[360px] w-full sm:h-[420px]">
        {validToken ? (
          <>
            <div ref={mapContainerRef} className="h-full w-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
                Loading Mapbox route…
              </div>
            )}
          </>
        ) : (
          <RouteFallback shipment={shipment} status={status} />
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2 sm:right-auto">
          <MapLegendDot color="#0F172A" label="Origin" />
          <MapLegendDot color="#F59E0B" label="Checkpoint" />
          <MapLegendDot color="#16A34A" label="Destination" />
          <MapLegendDot color={getStatusColor(status)} label="Live position" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Map showing {shipment.id} from {shipment.origin} to{" "}
        {shipment.destination}, currently {status}.
      </p>
    </section>
  );
}

function MapLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-sm backdrop-blur-sm">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function RouteFallback({ shipment, status }: ShipmentTrackingMapProps) {
  const coordinates = shipment.route.coordinates;
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;
  const toPoint = ([lng, lat]: LngLat) => ({
    x: 8 + ((lng - minLng) / lngRange) * 84,
    y: 88 - ((lat - minLat) / latRange) * 76,
  });
  const points = coordinates
    .map((coordinate) => {
      const point = toPoint(coordinate);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const current = toPoint(shipment.route.currentCoordinate);

  return (
    <div className="relative h-full overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-blue-100">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.4"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-lg"
        style={{
          left: `${current.x}%`,
          top: `${current.y}%`,
          backgroundColor: getStatusColor(status),
        }}
        aria-label={`Current location for ${shipment.id}`}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(90%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/90 p-5 text-center shadow-lg backdrop-blur-sm">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-neutral-950 text-white">
          <Truck className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-3 font-bold text-neutral-950">Mapbox token required</p>
        <p className="mt-1 text-sm text-neutral-600">
          Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive route map.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700">
          <Route className="size-4" aria-hidden="true" />
          {shipment.origin} to {shipment.destination}
        </div>
      </div>
    </div>
  );
}
